import { OrderedMap, Map, List } from 'immutable'
import {
  GET_TRANSACTIONLIST_REQUEST,
  GET_TRANSACTIONLIST_SUCCESS,
  GET_TRANSACTIONLIST_FAILURE,
  DELETE_TRANSACTION_REQUEST,
  DELETE_TRANSACTION_CANCEL,
  DELETE_TRANSACTION_APPROVE,
  DELETE_TRANSACTION_SUCCESS,
  TRANSACTION_DIALOG_OPEN,
  TRANSACTION_DIALOG_CLOSE,
  TRANSACTION_DIALOG_CHANGE,
  TRANSACTION_DIALOG_CLOSESAVE_SET,
  GET_LASTTRANSACTION_SUCCESS,
  TRANSACTION_PARTIAL_UPDATE,
  TRANSACTION_PARTIAL_SUCCESS
} from '../constants/Transaction'
import { GET_SETTING_SUCCESS } from '../constants/Setting'

const initialState = Map({
  transactionList: OrderedMap(),
  lastTransactionList: OrderedMap(),
  ui: Map({
    transactionListLoading: true,
    transactionListError: false
  }),
  delete: Map({
    id: '',
    approvementDialogVisible: false,
    loading: false
  }),
  dialog: Map({
    open: false,
    closeOnSave: false,
    id: -1,
    transaction: Map({ comment: '', tags: [], operations: [{ amount: 0 }, { amount: 0 }] }),
    valid: false,
    errors: Map({ valid: true, errors: List(), operations: List() })
  })
})

function validateTransactionForm (tx) {
  let errors = Map()
  let operationErrors = List()

  let easeForMultiCurrency = false

  let valid = true

  tx.get('operations').forEach((item) => {
    let operationError = Map()

    if (!/^-?(0|[1-9]\d*)\.?\d{0,2}?$/.test(item.amount)) {
      operationError = operationError.set('amount', 'Amount is invalid')
      valid = false
    }

    if (item.rate && !/^-?(0|[1-9]\d*)\.?\d{0,4}?$/.test(item.rate)) {
      operationError = operationError.set('rate', 'Rate is invalid')
      valid = false
    }

    if (!item.account_id || item.account_id === -1) {
      operationError = operationError.set('account_id', 'Account is not selected')
      valid = false
    }

    operationErrors = operationErrors.push(operationError)
  })

  errors = errors.set('operations', operationErrors)

  const ops = tx.get('operations').filter((item) => parseFloat(item.amount) !== 0)
  if (ops.length === 0) {
    errors = errors.set('transaction', 'Empty transaction')
    valid = false
  }
  const sum = ops.reduce((acc, item) => {
    let amount = parseFloat(item.amount)
    if (item.rate) {
      easeForMultiCurrency = true
      amount = amount * parseFloat(item.rate)
    }
    return acc + amount
  }, 0)
  if (!Number.isNaN(sum)) {
    const fixedSum = sum.toFixed(2)
    if (!(parseFloat(fixedSum) > -1 && parseFloat(fixedSum) < 1) || (parseFloat(fixedSum) !== 0 && !easeForMultiCurrency)) {
      errors = errors.set('transaction', 'Transaction not balanced, disbalance is: ' + fixedSum)
      valid = false
    }
  } else {
    errors = errors.set('transaction', 'Empty transaction')
  }

  return Map({ valid, errors })
}

export default function transactionReducer (state = initialState, action) {
  switch (action.type) {
    case GET_LASTTRANSACTION_SUCCESS:
      return state.set('lastTransactionList', action.payload)
    case TRANSACTION_DIALOG_CHANGE:
      var valid = validateTransactionForm(action.payload)
      return state.setIn(['dialog', 'transaction'], action.payload)
        .setIn(['dialog', 'valid'], valid.get('valid'))
        .setIn(['dialog', 'errors'], valid.get('errors'))
    case TRANSACTION_DIALOG_CLOSE:
      return state.setIn(['dialog', 'open'], false)
    case TRANSACTION_DIALOG_OPEN:
      var validInitial = validateTransactionForm(action.payload.tx)
      return state.setIn(['dialog', 'transaction'], action.payload.tx)
        .setIn(['dialog', 'id'], action.payload.id)
        .setIn(['dialog', 'open'], true)
        .setIn(['dialog', 'valid'], validInitial.get('valid'))
        .setIn(['dialog', 'errors'], validInitial.get('errors'))
    case TRANSACTION_DIALOG_CLOSESAVE_SET:
      return state.setIn(['dialog', 'closeOnSave'], action.payload)
    case DELETE_TRANSACTION_APPROVE:
    case TRANSACTION_PARTIAL_UPDATE:
    case TRANSACTION_PARTIAL_SUCCESS:
      return state.setIn(['transactionList', action.payload.id], action.payload.tx)
        .setIn(['ui', 'transactionListLoading'], false)
        .setIn(['delete', 'approvementDialogVisible'], false)
    case GET_SETTING_SUCCESS:
      var closeTransactionDialog = action.payload.get('ui.transaction.closedialog').get('value') === 'true'
      return state.setIn(['dialog', 'closeOnSave'], closeTransactionDialog)
    case DELETE_TRANSACTION_REQUEST:
      return state.setIn(['delete', 'approvementDialogVisible'], true)
        .setIn(['delete', 'id'], action.payload)
    case DELETE_TRANSACTION_CANCEL:
      return state.setIn(['delete', 'approvementDialogVisible'], false)
        .setIn(['delete', 'transaction'], Map({ comment: '' }))
    case DELETE_TRANSACTION_SUCCESS:
      return state.update('transactionList', (transactions) => transactions.remove(action.payload))
        .setIn(['delete', 'id'], '')
    case GET_TRANSACTIONLIST_REQUEST:
      return state.setIn(['ui', 'transactionListLoading'], true)
        .setIn(['ui', 'transactionListError'], false)
    case GET_TRANSACTIONLIST_SUCCESS:
      return state.setIn(['ui', 'transactionListLoading'], false)
        .setIn(['ui', 'transactionListError'], false)
        .set('transactionList', action.payload)
    case GET_TRANSACTIONLIST_FAILURE:
      return state.setIn(['ui', 'transactionListLoading'], false)
        .setIn(['ui', 'transactionListError'], true)
    default:
      return state
  }
}

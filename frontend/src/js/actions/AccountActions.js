import { Map } from 'immutable'
import { checkApiError, parseJSON, dataToMap, mapToData, singleToMap } from '../util/ApiUtils'
import { loadBudgetEntryList } from './BudgetEntryActions'
import { loadTotalsReport } from './ReportActions'

import {
  GET_ACCOUNTLIST_REQUEST,
  GET_ACCOUNTLIST_SUCCESS,
  GET_ACCOUNTLIST_FAILURE,
  TOGGLE_HIDDEN_ACCOUNTS,
  ACCOUNT_DIALOG_OPEN,
  ACCOUNT_DIALOG_CLOSE,
  ACCOUNT_PARTIAL_UPDATE,
  ACCOUNT_PARTIAL_SUCCESS
} from '../constants/Account'

export function loadAccountList () {
  return (dispatch) => {
    dispatch({
      type: GET_ACCOUNTLIST_REQUEST,
      payload: true
    })

    const url = '/api/account'

    fetch(url)
      .then(parseJSON)
      .then(checkApiError)
      .then(dataToMap)
      .then(function (data) {
        dispatch({
          type: GET_ACCOUNTLIST_SUCCESS,
          payload: data
        })
      })
      .catch(function (response) {
        dispatch({
          type: GET_ACCOUNTLIST_FAILURE,
          payload: response.json
        })
      })
  }
}

export function toggleHiddenAccounts (visible) {
  return (dispatch) => {
    dispatch({
      type: TOGGLE_HIDDEN_ACCOUNTS,
      payload: visible
    })
  }
}

export function updateAccount (id, account) {
  return (dispatch, getState) => {
    dispatch({
      type: ACCOUNT_PARTIAL_UPDATE,
      payload: {
        id,
        account: account.set('loading', true)
      }
    })

    if (account.get('category_id') === -1) {
      // We use -1 as a fake default value to make MUI happy
      // mdg have no idea on that
      account = account.delete('category_id')
    }

    const state = getState()
    const selectedBudgetId = state.get('budgetentry').get('currentBudget').get('id')

    let url = '/api/account'
    let method = 'POST'
    if (id !== -1) {
      url = url + '/' + id
      method = 'PUT'
    }

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/vnd.mdg+json'
      },
      body: JSON.stringify(mapToData(id, account))
    })
      .then(parseJSON)
      .then(singleToMap)
      .then(checkApiError)
      .then(map => {
        if (id === -1) {
          dispatch(loadAccountList())
        } else {
          dispatch({
            type: ACCOUNT_PARTIAL_SUCCESS,
            payload: {
              id,
              account: map.first()
            }
          })
        }
      })
      .then(() => dispatch(loadTotalsReport()))
      .then(() => { if (selectedBudgetId) { dispatch(loadBudgetEntryList(selectedBudgetId)) } })
      .catch(() => dispatch(loadAccountList()))
  }
}

export function createAccount () {
  return (dispatch, getState) => {
    const state = getState()

    dispatch({
      type: ACCOUNT_DIALOG_OPEN,
      payload: {
        full: true,
        id: -1,
        account: Map({ name: '', account_type: 'asset', balance: 0, currency_id: state.get('setting').get('primaryCurrency') })
      }
    })
  }
}

export function editAccount (id, account) {
  return {
    type: ACCOUNT_DIALOG_OPEN,
    payload: {
      full: false,
      id,
      account
    }
  }
}

export function editAccountCancel () {
  return {
    type: ACCOUNT_DIALOG_CLOSE,
    payload: true
  }
}

export function editAccountSave (account) {
  return (dispatch, getState) => {
    dispatch({
      type: ACCOUNT_DIALOG_CLOSE,
      payload: true
    })
    dispatch({
      type: GET_ACCOUNTLIST_REQUEST,
      payload: true
    })
    const state = getState()
    const id = state.get('account').getIn(['dialog', 'id'])
    dispatch(updateAccount(id, account))
  }
}

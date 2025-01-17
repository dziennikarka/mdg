import { connect } from 'react-redux'

import BudgetOverviewPanel from '../components/budget/BudgetOverviewPanel'

const mapStateToProps = (state) => {
  return {
    budget: state.get('budgetentry').get('currentBudget')
  }
}

export default connect(mapStateToProps)(BudgetOverviewPanel)

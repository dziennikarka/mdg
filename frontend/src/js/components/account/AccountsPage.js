import React, {Component, Fragment} from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import ClipLoader from 'react-spinners/ClipLoader';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import AccountEditor from '../../containers/AccountEditor'
import CategorizedAccountList from './CategorizedAccountList.js'

export default class AccountsPage extends Component {
  constructor(props) {
      super(props);
      this.state = {
          tabValue: 'asset'
      };
  }

    onHiddenAccountsClick() {
        this.props.actions.toggleHiddenAccounts(!this.props.hiddenVisible)
    }

    onCreateAccountClick() {
        this.props.actions.createAccount();
    }

    switchTab(ev, value) {
        this.setState({
            tabValue: value,
        });
    }

    render() {
        var props = this.props;

        var cardStyle = {
            'marginTop': 15,
            'height': 120
        };

        var accounts;
        if (props.waiting) {
            accounts = <ClipLoader sizeUnit={'px'} size={150} loading={true}/>;
        } else if (props.error) {
            accounts = <h1>Unable to load account list</h1>
        } else {
          accounts =
            <Fragment>
              <Tabs value={this.state.tabValue} onChange={::this.switchTab} centered scrollButtons='auto'>
                  <Tab label='Asset accounts' value='asset'/>
                  <Tab label='Income accounts' value='income'/>
                  <Tab label='Expense accounts' value='expense'/>
              </Tabs>
              {this.state.tabValue == 'asset' && <CategorizedAccountList categoryList={props.categoryList} actions={props.actions} currencies={props.currencies} accounts={props.assetAccounts} hiddenVisible={props.hiddenVisible}/>}
              {this.state.tabValue == 'income' && <CategorizedAccountList categoryList={props.categoryList} actions={props.actions} currencies={props.currencies} accounts={props.incomeAccounts} hiddenVisible={props.hiddenVisible}/>}
              {this.state.tabValue == 'expense' && <CategorizedAccountList categoryList={props.categoryList} actions={props.actions} currencies={props.currencies} accounts={props.expenseAccounts} hiddenVisible={props.hiddenVisible}/>}
            </Fragment>
        }

        var hiddenButton;
        if (props.hiddenVisible) {
            hiddenButton = <Button color='primary' onClick={this.onHiddenAccountsClick.bind(this)}>Hide hidden accounts</Button>
        } else {
            hiddenButton = <Button color='primary' onClick={this.onHiddenAccountsClick.bind(this)}>Show hidden accounts</Button>
        }

        var primaryCurrencyName = '';
        if (props.currencies.has(props.primaryCurrency)) {
          primaryCurrencyName = props.currencies.get(props.primaryCurrency).get('name')
        }

        return (
            <div>
                <AccountEditor/>
                <Card style={cardStyle}>
                    <CardContent>
                        <Grid container spacing={2}>
                                <Grid item  xs={12} sm={12} md={6} lg={4}>
                                    <p>Total: {props.totals.get('total')} {primaryCurrencyName}</p>
                                </Grid>
                                <Grid item  xs={6} sm={6} md={6} lg={4} className='hide-on-small'>
                                    <p>Favorite: {props.totals.get('favorite')} {primaryCurrencyName}</p>
                                </Grid>
                                <Grid item  xs={6} sm={6} md={4} lg={4} className='hide-on-small hide-on-medium'>
                                    <p>Operational: {props.totals.get('operational')} {primaryCurrencyName}</p>
                                </Grid>
                                <Grid item  xs={12} sm={12} md={6} lg={3}>
                                    <Button aria-label='Add account' color='secondary' onClick={::this.onCreateAccountClick}>Add account</Button>
                                </Grid>
                                <Grid item  xs={12} sm={12} md={6} lgOffset={6} lg={3}  className='hide-on-small'>
                                    {hiddenButton}
                                </Grid>
                        </Grid>
                    </CardContent>
                </Card>
                {accounts}
            </div>
        )
    }
}

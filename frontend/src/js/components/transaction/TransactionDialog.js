import React,{Fragment} from 'react';
import {evaluate} from 'mathjs';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import PlaylistAdd from '@mui/icons-material/PlaylistAdd';
import moment from 'moment';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DatePicker from 'react-date-picker'
import TimePicker from 'react-time-picker';
import Checkbox from '@mui/material/Checkbox';
import RSelect from 'react-select';

import {AccountMapper} from '../../util/AccountUtils'

class SimpleOperationsEditor extends React.Component {
    render() {
        const props = this.props;

        const errors = props.errors;
        const operations = props.operations;

        let textLabel = 'Amount';
        let textError = false;
        if (errors.get('operations').get(1).has('amount')) {
            textLabel = errors.get('operations').get(1).get('amount');
            textError = true
        }

        let textLeftLabel = 'Source';
        let textLeftError = false;
        if (errors.get('operations').get(0).has('account_id')) {
            textLeftLabel = errors.get('operations').get(0).get('account_id');
            textLeftError = true
        }

        let textRightLabel = 'Destination';
        let textRightError = false;
        if (errors.get('operations').get(1).has('account_id')) {
            textRightLabel = errors.get('operations').get(1).get('account_id');
            textRightError = true
        }

        return (
            <Grid  container spacing={2}>
                    <Grid item xs={5} sm={5} md={5} lg={4}>
                        <FormControl error={textLeftError} fullWidth={true}>
                            <InputLabel htmlFor={'source-simple'}>{textLeftLabel}</InputLabel>
                            <Select value={operations[0].account_id}
                                    onChange={(ev) => props.onAccountFunc(0, ev.target.value)}
                                    inputProps={{id: 'source-simple'}}>
                                {props.accounts.getAccounts()}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={2} sm={2} md={2} lg={2}>
                        <TextField label={textLabel} error={textError} value={operations[1].amount}
                                   onChange={props.onAmountFunc}/>
                    </Grid>
                    <Grid item xsOffset={1} xs={5} sm={5} md={5} lg={4}>
                        <FormControl error={textRightError} fullWidth={true}>
                            <InputLabel htmlFor={'destination-simple'}>{textRightLabel}</InputLabel>
                            <Select value={operations[1].account_id}
                                    onChange={(ev) => props.onAccountFunc(1, ev.target.value)}
                                    inputProps={{id: 'destination-simple'}}>
                                {props.accounts.getLimitedAccounts(operations[0])}
                            </Select>
                        </FormControl>
                    </Grid>
            </Grid>
        );
    }
}

class FullOperationsEditor extends React.Component {
    checkRateDisabled(operation) {
        const props = this.props;
        // First check - if we only have ops in same currency, rate should be definitely disabled.
        var accounts = props.accounts.accounts;
        var currencies = props.operations
            .map((item) => item.account_id)
            .filter((item) => !(item === undefined))
            .map((acc_id) => accounts.get(acc_id))
            .filter((item) => !(item === undefined))
            .map((item) => item.get('currency_id'))
            .filter((value, index, self) => self.indexOf(value) === index);
        if (currencies.length <= 1) {
            return true
        }

        //Second check - in case our currency is the primary currency
        if (accounts.has(operation.account_id)) {
            if (accounts.get(operation.account_id).get('currency_id') === props.primaryCurrency) {
                return true;
            }
        }

        //Third check - in case we don't have any op with primary currency
        //we should disable rate for all ops, having same currency as the first
        //op of the transaction
        var txCurrencies = props.operations
            .map((item) => item.account_id)
            .filter((item) => !(item === undefined || item === -1))
            .map((acc_id) => accounts.get(acc_id))
            .map((item) => item.get('currency_id'))
            .filter((value, index, self) => self.indexOf(value) === index)
            .filter((item) => item === props.primaryCurrency);
        if (txCurrencies.length === 0) {
            //Ok, we do not have primary currency at the transaction
            if (props.operations.length > 0) {
                if (accounts.has(props.operations[0].account_id)) {
                    var firstCurrency = accounts.get(props.operations[0].account_id);
                    if (firstCurrency === accounts.get(operation.account_id)) {
                        return true
                    }
                }
            }
        }

        return false;
    }

    render() {
        const parent = this;
        const props = this.props;
        const errors = props.errors;

        var ops = this.props.operations.map(function (item, index) {
            var textLabel = 'Amount';
            var textError = false;
            if (errors.get('operations').get(index).has('amount')) {
                textLabel = errors.get('operations').get(index).get('amount');
                textError = true
            }

            var textRateLabel = 'Rate';
            var textRateError = false;
            if (errors.get('operations').get(index).has('rate')) {
                textRateLabel = errors.get('operations').get(index).get('rate');
                textRateError = true
            }

            var textAccountLabel = 'Account';
            var textAccountError = false;
            if (errors.get('operations').get(index).has('account_id')) {
                textAccountLabel = errors.get('operations').get(index).get('account_id');
                textAccountError = true
            }

            return (
                <Grid  container spacing={2}  key={'op'+index}>
                        <Grid item xs={4} sm={4} md={4} lg={4}>
                            <TextField label={textLabel} error={textError} value={item.amount}
                                       onChange={(ev) => props.onAmountFunc(index, ev.target.value)}/>
                        </Grid>
                        <Grid item xs={4} sm={4} md={4} lg={4}>
                            <TextField label={textRateLabel} error={textRateError} value={item.rate}
                                       onChange={(ev) => props.onRateFunc(index, ev.target.value)}
                                       disabled={parent.checkRateDisabled(item)}/>
                        </Grid>
                        <Grid item xs={4} sm={4} md={4} lg={4}>
                            <FormControl error={textAccountError} fullWidth={true}>
                                <InputLabel htmlFor={'destination-simple'}>{textAccountLabel}</InputLabel>
                                <Select value={item.account_id}
                                        onChange={(ev) => props.onAccountFunc(index, ev.target.value)}
                                        inputProps={{id: 'destination-simple'}}>
                                    {props.accounts.getAccounts()}
                                </Select>
                            </FormControl>
                        </Grid>
                </Grid>)
        });

        return (
            <Fragment>
                {ops}
                    <Grid  container spacing={2}>
                            <Grid item xs={1} xsOffset={5} sm={1} smOffset={5} md={1} mdOffset={5} lg={1}
                                 lgOffset={5}>
                                <IconButton onClick={props.operationAddFunc}><PlaylistAdd/></IconButton>
                            </Grid>
                    </Grid>
            </Fragment>
        );
    }
}

export default class TransactionDialog extends React.Component {
    constructor(props) {
        super(props);
        var tab = 'simple';
        if (!this.validForSimpleEditing(this.props.transaction)) {
            tab = 'multi'
        }

        this.state = {
            tabValue: tab,
        };
    }

    onSaveCloseOnSave(value) {
      this.props.actions.setCloseOnSave(value)
    }

    onChange(field, value) {
        const tx = this.props.transaction.set(field, value);
        this.props.actions.editTransactionChange(tx);
    }

    onTagEdit(value) {
        const tags = value.map((item) => item.value);
        this.onChange('tags', tags)
    }

    onDateChange(date) {
        const newDate = moment(date);
        const dt = moment(this.props.transaction.get('timestamp'));
        dt.set({
            year: newDate.get('year'),
            month: newDate.get('month'),
            date: newDate.get('date')
        });
        this.onChange('timestamp', dt.format('YYYY-MM-DDTHH:mm:ss'));
    }

    onTimeChange(time) {
        const newDate = moment(time, 'HH:mm');
        const dt = moment(this.props.transaction.get('timestamp'));
        dt.set({
            hour: newDate.get('hour'),
            minute: newDate.get('minute')
        });
        this.onChange('timestamp', dt.format('YYYY-MM-DDTHH:mm:ss'));

    }

    onOperationAdd() {
        const ops = this.props.transaction.get('operations');
        ops.push({amount: 0, account_id: -1});
        this.onChange('operations', ops);
    }

    static evaluateEquation(value) {
        if (value) {
            const strAmount = value.toString();
            if (strAmount.slice(-1) === '=') { //If it ends with =
                var expr = strAmount.slice(0, -1); //Strip the = and evaluate mathematical expression
                try {
                    value = evaluate(expr).toFixed(2)
                } catch (e) {
                    value = expr
                }
            }
        }
        return value
    }

    onCombinedAmountChange(ev) {
        const value = TransactionDialog.evaluateEquation(ev.target.value);

        const ops = this.props.transaction.get('operations');
        ops[0].amount = -1 * value;
        ops[1].amount = value;
        this.onChange('operations', ops);
    }

    onAmountChange(index, value) {
        const ops = this.props.transaction.get('operations');
        ops[index].amount = TransactionDialog.evaluateEquation(value);
        this.onChange('operations', ops);
    }


    validForSimpleEditing() {
        const props = this.props;
        const transaction = props.transaction;
        const ops = transaction.get('operations');

        if (ops.length > 2) {
            return false
        }

        const accounts = props.accounts;
        if (accounts.has(ops[0].account_id) && accounts.has(ops[1].account_id)) {
            const leftCurrency = accounts.get(ops[0].account_id).get('currency_id');
            const rightCurrency = accounts.get(ops[1].account_id).get('currency_id');
            return leftCurrency === rightCurrency
        }
        return true
    }

    switchTab(ev, value) {
        if (!this.validForSimpleEditing(this.props.transaction)) {
            value = 'multi'
        }
        this.setState({
            tabValue: value,
        });
    }

    onAccountChange(index, value) {
        const ops = this.props.transaction.get('operations');
        ops[index].account_id = value;
        this.onChange('operations', ops)
    }

    onRateChange(index, value) {
        const ops = this.props.transaction.get('operations');
        ops[index].rate = TransactionDialog.evaluateEquation(value);
        this.onChange('operations', ops)
    }

    render() {
        const props = this.props;
        const transaction = props.transaction;
        const errors = props.errors;

        const validationErrorStyle = {
            'position': 'relative',
            'bottom': '-2px',
            'fontSize': '12px',
            'lineHeight': '12px',
            'color': 'rgb(244, 67, 54)',
            'transition': 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms'
        };

        const enableSimpleEditor = this.validForSimpleEditing(transaction);
        let activeTab = this.state.tabValue;

        if (!enableSimpleEditor) {
             activeTab = 'multi';
        }

        const tags = props.tags.map((item) => {return {label: item.get('txtag'), value: item.get('txtag')}}).valueSeq().toJS();
        const selectedTags = transaction.get('tags').map((item) => {return {label: item, value: item}});

        const ts = moment(transaction.get('timestamp'));

        const accounts = new AccountMapper(props.currencies, props.categories, props.accounts);

        return (<Dialog title='Transaction editing' open={props.open} scroll={'paper'} maxWidth={'md'} fullWidth={true}>
            <DialogContent>
                <Grid  container spacing={2}>
                        <Grid item xs={12} sm={12} md={6} lg={6}>
                            <DatePicker value={ts.toDate()} onChange={::this.onDateChange}/>
                        </Grid>
                        <Grid item xs={12} sm={12} md={6} lg={6}>
                            <TimePicker value={ts.toDate()} onChange={::this.onTimeChange}/>
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} lg={12}>
                            <RSelect options={tags} isMulti={true} onChange={::this.onTagEdit} value={selectedTags}/>
                        </Grid>
                        <Grid item xs={12} sm={12} md={12} lg={12}>
                            <TextField label='Comment on transaction' fullWidth={true} multiline={true} rows={4}
                                       value={transaction.get('comment')} onChange={(event) => ::this.onChange('comment', event.target.value)}/>
                        </Grid>
                </Grid>
                <Divider/>
                <Tabs value={activeTab} onChange={::this.switchTab}>
                    <Tab label='Simple' value='simple' disabled={!enableSimpleEditor}/>
                    <Tab label='Multiple operations' value='multi'/>
                </Tabs>
                {activeTab === 'simple' &&
                <SimpleOperationsEditor errors={errors}
                                        operations={transaction.get('operations')}
                                        onAmountFunc={::this.onCombinedAmountChange}
                                        onAccountFunc={::this.onAccountChange}
                                        accounts={accounts}/>}
                {activeTab === 'multi' && <FullOperationsEditor errors={errors}
                                                                          operations={transaction.get('operations')}
                                                                          onAmountFunc={::this.onAmountChange}
                                                                          onAccountFunc={::this.onAccountChange}
                                                                          onRateFunc={::this.onRateChange}
                                                                          operationAddFunc={::this.onOperationAdd}
                                                                          primaryCurrency={props.primaryCurrency}
                                                                          accounts={accounts}/>}
                <Grid  container spacing={2}>
                        <Grid item xs={12} sm={12} md={12} lg={12}>
                            <div style={validationErrorStyle}>{errors.get('transaction')}</div>
                        </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                  <InputLabel htmlFor={'close-dialog'}>Close dialog on save</InputLabel>
                  <Checkbox checked={props.closeOnSave} inputProps={{id: 'close-dialog'}} onChange={(ev, value) => ::this.onSaveCloseOnSave(value)}/>
                <Button color='primary' disabled={!props.valid} onClick={::this.props.actions.editTransactionSave}>Save</Button>
                <Button color='secondary' onClick={::this.props.actions.editTransactionCancel}>Cancel</Button>
            </DialogActions>
        </Dialog>)
    }
}

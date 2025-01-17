import React, {Component, Fragment} from 'react';
import moment from 'moment';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import DatePicker from 'react-date-picker';
import {ErrorMessage} from 'formik';
import {Formik, Form, Field} from 'formik';
import Button from '@mui/material/Button';
import ClipLoader from 'react-spinners/ClipLoader';
import Grid from '@mui/material/Grid';

class FormikDatePicker extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    handleChange = value => {
        this.props.form.setFieldValue(this.props.field.name, value, true);
    };

    handleBlur = () => {
        this.props.form.setFieldTouched(this.props.field.name, true);
    };

    render() {
        return (
            <DatePicker
                autoComplete='off'
                id={this.props.id}
                value={
                    typeof this.props.field.value === 'string'
                        ? moment(this.props.field.value)
                        : this.props.field.value
                }
                onBlur={this.handleBlur}
                dateFormat='DD-MM-YYYY'
                onChange={this.handleChange}
                showYearDropdown
                dateFormatCalendar='MMMM'
                scrollableYearDropdown
                disabled={this.props.field.disabled}
                yearDropdownItemNumber={15}
            />
        );
    }
}

export default class BudgetList extends Component {
    onCreateBudget(values, form) {
        this.props.actions.budgetCreate(values.begin, values.end);
        form.resetForm();
    }

    onDeleteBudget() {
        this.props.actions.deleteBudget(this.props.budget.get('id'))
    }


    newBudgetValidate() {
        const props = this.props;
        return (values) => {
            let errors = {};
            if (!values.begin || !values.end) {
                return errors
            }

            const b = new Date(values.begin);
            const e = new Date(values.end);

            if (b > e) {
                errors.end = 'Budget should begin before it\'s completion'
            } else {
                const oneDay = 24 * 60 * 60 * 1000;
                const days = Math.round((e.getTime() - b.getTime()) / oneDay);
                if (days < 1) {
                    errors.end = 'Budget should be at least one full day long'
                }
            }


            props.budgets.forEach(budget => {
                const tb = new Date(budget.get('term_beginning'));
                const te = new Date(budget.get('term_end'));
                if (tb <= e && te >= b) {
                    errors.begin = 'Budget is overlapping with existing budgets'
                }
            });
            return errors
        }
    }

    createForm() {
        const props = this.props;

        const initialValues = {
            begin: props.begin,
            end: props.end
        };

        return <Formik initialValues={initialValues} validate={::this.newBudgetValidate()}
                       onSubmit={::this.onCreateBudget}>
            {({submitForm, isSubmitting, values}) => (
                <Form>
                    <Grid container spacing={2}>
                            <Grid item xs={4} lg={3}>
                                <Field type='text' name='begin' label='First budget day' value={values.begin}
                                       component={FormikDatePicker}/>
                            </Grid>
                            <Grid item xs={4} lg={2}>
                                <Field type='text' name='end' label='Last budget day' value={values.end}
                                       component={FormikDatePicker}/>
                            </Grid>
                            <Grid item xs={4} lg={2}>
                                <Button color='primary' disabled={isSubmitting} onClick={submitForm}>Create budget</Button>
                            </Grid>
                            <Grid item xs={4} lg={3}>
                                <ErrorMessage name='begin' component='div'/>
                            </Grid>
                            <Grid item xs={4} lg={2}>
                                <ErrorMessage name='end' component='div'/>
                            </Grid>
                    </Grid>
                </Form>
            )}
        </Formik>;

    }

    selector() {
        const props = this.props;

        if (props.waiting) {
            return <ClipLoader sizeUnit={'px'} size={25} loading={true}/>
        }
        if (props.error) {
            return <h1>Unable to load budget list</h1>
        }
        const budgetList = props.budgets.map((v, k) => <MenuItem key={k}
                                                                 value={k}>{v.get('term_beginning') + ' - ' + v.get('term_end')}</MenuItem>).valueSeq().toJS();

        return (
            <Fragment>
                <InputLabel htmlFor={'budget-selector'}>Select budget:</InputLabel>
                <Select value={props.budget.get('id')} onChange={(ev) => props.actions.selectBudget(ev.target.value)}
                        inputProps={{id: 'budget-selector'}}>
                    {budgetList}
                </Select>
                <Button color='primary' onClick={::this.onDeleteBudget}>Delete selected budget</Button>
            </Fragment>
        )
    }

    render() {
        return (
            <Fragment>
                {::this.selector()}
                {::this.createForm()}
            </Fragment>
        )
    }
}

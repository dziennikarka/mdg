import { connect } from 'react-redux';

import { selectActiveCurrencies,selectInactiveCurrencies } from '../selectors/CurrencySelector'
import ActiveCurrencyEditor from '../components/settings/ActiveCurrencyEditor';
import { updateCurrency } from '../actions/CurrencyActions';
import Currency from "../models/Currency";

export interface CurrencyEditorState {
    activeCurrencies: Currency[]
    inactiveCurrencies: Currency[]
    available: boolean
}

const mapStateToProps = (state):CurrencyEditorState => {
    return {
        activeCurrencies: selectActiveCurrencies(state),
        inactiveCurrencies: selectInactiveCurrencies(state),
        available: state.get('currency').available
    };
};

const mapDispatchToProps = { updateCurrency };

export type CurrencyEditorProps = CurrencyEditorState & typeof mapDispatchToProps

export default connect(mapStateToProps, mapDispatchToProps)(ActiveCurrencyEditor);

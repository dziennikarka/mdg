import {connect} from 'react-redux';

import AccountDialog from '../components/account/AccountDialog';
import {updateAccount} from '../actions/AccountActions';
import {Account} from "../models/Account";
import {RootState} from "../reducers/rootReducer";
import Category from "../models/Category";
import Currency from "../models/Currency";
import {selectActiveCurrencies} from "../selectors/CurrencySelector";

export interface AccountEditorProps {
    account: Account;
    close: () => void;
    full: boolean;
    open: boolean;
}

export interface AccountEditorState {
    categories: Category[];
    currencies: Currency[];
    account: Account;
    full: boolean;
    open: boolean;
    close: () => void;
}

const mapStateToProps = (state: RootState, ownProps: AccountEditorProps): AccountEditorState => {
    return {
        categories: state.category.categoryList,
        currencies: selectActiveCurrencies(state),
        account: ownProps.account,
        full: ownProps.full,
        open: ownProps.open,
        close: ownProps.close
    }
}

const mapDispatchToProps = {updateAccount};

export type AccountDialogProps = AccountEditorState & typeof mapDispatchToProps

export default connect(mapStateToProps, mapDispatchToProps)(AccountDialog)

import React, {Component} from 'react';
import {Card, CardHeader, CardText} from 'material-ui/Card';
import Divider from 'material-ui/Divider';
import {GridList, GridTile} from 'material-ui/GridList';
import {Grid, Row, Col} from 'react-flexbox-grid';
import CircularProgress from 'material-ui/CircularProgress';

import Transaction from './Transaction';

export default class OperationsPage extends Component {
    makeAccountsList(props) {
        return props.assetAccounts.concat(props.incomeAccounts, props.expenseAccounts)
    }

    render() {
        var props = this.props;

        var accounts = ::this.makeAccountsList(props);

        var transactions;
        if (props.waiting) {
            transactions = <CircularProgress/>;
        } else if (props.error) {
            transactions = <h1>Unable to load transactions list</h1>
        } else {
            transactions = props.transactions.map(function (item) {
                return (
                    <GridTile key={item.id}><Transaction transaction={item} accounts={accounts}/></GridTile>
                )
            });
        }

        return <div>
            <Card>
                <CardHeader
                    title='Showing from 02-05-2017 till 02-06-2017'
                    actAsExpander={true}
                    showExpandableButton={true}
                />
                <CardText expandable={true}>
                    Filter is here
                </CardText>
            </Card>
            <Divider/>
            <GridList cols={1} cellHeight='auto'>
                <GridTile>
                    <Card>
                        <CardHeader>
                            <Grid>
                                <Row>
                                    <Col xs={1}/>
                                    <Col xs={1}>Date</Col>
                                    <Col xs={3}>Comment</Col>
                                    <Col xs={2}>Amount</Col>
                                    <Col xs={2}>Accounts</Col>
                                    <Col xs={2}>Tags</Col>
                                    <Col xs={1}/>
                                </Row>
                            </Grid>
                        </CardHeader>
                    </Card>
                </GridTile>
                {transactions}
            </GridList>
        </div>;
    }
}

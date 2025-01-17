const pactum = require('pactum');
const { createAccountForTransaction } = require('./transaction.handler');

describe('Transaction full text search', () => {
    const e2e = pactum.e2e('Transaction operations');

    it.skip('Force transactions full text re-index', async () => {
        await e2e.step('Force transactions full text re-index')
            .spec('update')
            .put('/settings/{id}')
            .withPathParams('id', 'mnt.transaction.reindex')
            .withRequestTimeout(10000)
            .expectResponseTime(10000);
    }).timeout(15000);

    it.skip('Create income transactions', async () => {
        await createAccountForTransaction(e2e);

        await e2e.step('Create transaction')
            .spec('Create Transaction', { '@DATA:TEMPLATE@': 'Transaction:Income:V1' });
    });

    it.skip('Transaction search by malformed comment', async () => {
        await e2e.step('List transactions')
            .spec('read')
            .get('/transactions')
            .withQueryParams('q', '%7B%22comment%22%3A%22incme%22%7D')
            .expectJsonLike('transactions[*].comment', ['Income transaction']);

        await e2e.cleanup();
    });

    it.skip('Transaction search by malformed tag', async () => {
        await e2e.step('List transactions')
            .spec('read')
            .get('/transactions')
            .withQueryParams('q', '%7B%22tag%22%3A%20%22incme%22%7D')
            .expectJsonLike('transactions[*].tags', ['income', 'transaction']);

        await e2e.cleanup();
    });
});

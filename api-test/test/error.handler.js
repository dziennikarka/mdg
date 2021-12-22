const { addSpecHandler } = require('pactum').handler;

addSpecHandler('expect error', (ctx) => {
  const { spec, data } = ctx;
  const { statusCode, errorCode } = data;
  spec.expectStatus(statusCode);
  spec.expectHeader('content-type', 'application/vnd.mdg+json');
  spec.expectJson('errors[0].code', errorCode);
});

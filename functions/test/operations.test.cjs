const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { metrics, transitions } = require('../lib/operations');
const { validSignature } = require('../lib/payments');
const { validateSettings, deliveryQuote } = require('../lib/settings');

test('webhooks require the exact signed raw body', () => {
  const body=Buffer.from('{"event":"charge.success"}'),key='test_secret';
  const signature=createHmac('sha512',key).update(body).digest('hex');
  assert.equal(validSignature(body,signature,key),true);
  assert.equal(validSignature(Buffer.from('{}'),signature,key),false);
  assert.equal(validSignature(body,'bad',key),false);
  assert.equal(validSignature(body,signature,'wrong'),false);
});
test('delivery charges and terms must be configured and unique', () => {
  assert.throws(()=>deliveryQuote(validateSettings({}),'ghana'));
  const config=validateSettings({serviceArea:'Ghana',supportPhone:'0594081604',deliveryZones:[{id:'area',name:'Test area',fee:10,timing:'Test timing'}]});
  assert.equal(deliveryQuote(config,'area').deliveryMinor,1000);
  assert.throws(()=>deliveryQuote(config,'outside'));
  assert.throws(()=>validateSettings({...config,deliveryZones:[...config.deliveryZones,...config.deliveryZones]}));
  assert.throws(()=>validateSettings({...config,taxBasisPoints:10000}));
});
test('profit reports include actual costs, refunds, recovery and repeat deliveries; missing costs stay unknown', () => {
  const base={user_id:'a',status:'delivered',payment_status:'paid',total:110,tax:0,goods_cost:60,payment_fee:2,delivery_cost:12,support_cost:3,refund_cost:0,goods_recovered:0};
  const rows=[base,{...base},{...base,user_id:'b',status:'refunded',payment_status:'refunded',refunded_amount:110,goods_recovered:60,refund_cost:4},
    {...base,user_id:'c',goods_cost:null},{...base,status:'expired',payment_status:'awaiting_payment'}];
  const result=metrics(rows,90);
  assert.equal(result.delivered,3);assert.equal(result.cancellations,1);assert.equal(result.repeatCustomers,1);assert.equal(result.customers,2);
  assert.equal(result.cac,45);assert.equal(result.contribution,45);assert.equal(result.costedOrders,3);assert.equal(result.missingCosts,1);
  assert.deepEqual(transitions.paid,['processing']);assert.equal(transitions.pending,undefined);
});

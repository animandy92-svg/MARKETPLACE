const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateItems, quoteItems, assertPayment } = require('../lib/checkout');

test('rejects malformed, negative, fractional, duplicate and oversized carts', () => {
  for (const input of [null, [], [{productId:'../x',quantity:1}], [{productId:'a',quantity:-1}],
    [{productId:'a',quantity:1.5}], [{productId:'a',quantity:'1'}], [{productId:'a',quantity:100}],
    [{productId:'a',quantity:1},{productId:'a',quantity:1}]]) {
    assert.throws(() => validateItems(input));
  }
});
test('ignores submitted prices and computes currency in minor units', () => {
  const items = validateItems([{productId:'a',quantity:3,price:0,total:0}]);
  const quote = quoteItems(items, {a:{name:'Device',price:19.99,stock:4}});
  assert.equal(quote.total, 65.97);
  assert.equal(quote.amountMinor, 6597);
  assert.equal(quote.items[0].price, 19.99);
  assert.throws(() => quoteItems(items, {a:{price:19.99,stock:2}}));
  assert.throws(() => quoteItems(items, {}));
  assert.throws(() => quoteItems(items, {a:{price:19.99,stock:4,status:'sold'}}));
  assert.throws(() => quoteItems(items, {a:{price:19.99,stock:4,active:false}}));
});
test('rejects payment reuse for another user, order, currency or amount', () => {
  const intent = {user_id:'u',order_id:'o',reference:'jat_o',amount_minor:6597};
  const payment = {status:'success',currency:'GHS',amount:6597,reference:'jat_o',metadata:{user_id:'u',order_id:'o'}};
  assert.doesNotThrow(() => assertPayment(payment,intent,'u'));
  for (const override of [{status:'pending'},{currency:'USD'},{amount:1},{reference:'jat_other'},
    {metadata:{user_id:'other',order_id:'o'}},{metadata:{user_id:'u',order_id:'other'}}]) {
    assert.throws(() => assertPayment({...payment,...override},intent,'u'));
  }
  assert.throws(() => assertPayment(payment,intent,'other'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const projectId = 'demo-marketplace';
const api = `http://127.0.0.1:5001/${projectId}/us-central1/api/api`;

async function account(email) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'EmulatorOnly123!', returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function request(path, token, body) {
  const response = await fetch(`${api}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json() };
}

test('API verifies identity, authoritative order totals, and private order access', async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run through npm run test:api, never production');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const app = initializeApp({ projectId });
  try {
    const db = getFirestore(app);
    await db.collection('products').doc('calculator').set({
      name: 'Calculator', category: 'school', description: 'Test listing',
      price: 30, stock: 3, rating: 0, specs: [], image: '', active: true,
    });
    const buyer = await account('buyer@example.test');
    const other = await account('other@example.test');
    const body = { shippingAddress: 'Emulator test address', status: 'paid', total: 0,
      items: [{ productId: 'calculator', quantity: 2, price: 0.01 }] };

    assert.equal((await request('/orders', null, body)).status, 401);
    const profile = await request('/auth/firebase', buyer.idToken, {
      firebaseUid: other.localId, email: 'forged@example.test', role: 'admin', name: 'Buyer',
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.data.user.id, buyer.localId);
    assert.equal(profile.data.user.email, 'buyer@example.test');
    assert.equal(profile.data.user.role, 'buyer');

    const order = await request('/orders', buyer.idToken, body);
    assert.equal(order.status, 201);
    assert.equal(order.data.status, 'pending');
    assert.equal(order.data.total, 66);
    const saved = (await db.collection('users').doc(buyer.localId).collection('orders').doc(order.data.id).get()).data();
    assert.equal(saved.user_id, buyer.localId);
    assert.equal(saved.status, 'pending');
    assert.equal(saved.items[0].price, 30);
    assert.equal((await request('/orders', buyer.idToken)).data.length, 1);
    assert.equal((await request('/orders', other.idToken)).data.length, 0);
    assert.equal((await request('/orders', buyer.idToken, { ...body,
      items: [{ productId: 'calculator', quantity: -1 }] })).status, 400);

    await db.collection('products').doc('calculator').update({ active: false, status: 'sold' });
    assert.equal((await request('/orders', buyer.idToken, body)).status, 400);
  } finally {
    await deleteApp(app);
  }
});

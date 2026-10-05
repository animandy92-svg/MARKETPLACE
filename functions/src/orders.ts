import * as functions from 'firebase-functions/v1';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { db } from './firebase';
import { verifyAuth } from './middleware';
import { CheckoutError, validateItems, quoteItems } from './checkout';
import { deliveryQuote, settings } from './settings';

export function checkoutFailure(res: functions.Response, err: unknown) {
  if (err instanceof CheckoutError) res.status(err.status).json({ error: err.message });
  else { functions.logger.error('Checkout failed', err); res.status(500).json({ error: 'The service is temporarily unavailable. Please try again.' }); }
}

function orderInput(body: any) {
  const items = validateItems(body?.items);
  if (typeof body.shippingAddress !== 'string' || body.shippingAddress.trim().length < 5 || body.shippingAddress.length > 1000) throw new CheckoutError('Enter a full delivery address');
  if (typeof body.phone !== 'string' || !/^[+\d ()-]{7,30}$/.test(body.phone)) throw new CheckoutError('Enter a contact phone number for delivery');
  return { items, shipping_address: body.shippingAddress.trim(), phone: body.phone.trim() };
}

export async function prepareOrder(uid: string, body: any) {
  const input = orderInput(body);
  const delivery = deliveryQuote(await settings(), body.deliveryZone);
  const docs = await db.getAll(...input.items.map(item => db.doc(`products/${item.productId}`)));
  return { ...quoteItems(input.items, Object.fromEntries(docs.map(doc => [doc.id, doc.data()])), delivery),
    user_id: uid, shipping_address: input.shipping_address, phone: input.phone,
    delivery_zone: delivery.zone.name, delivery_timing: delivery.zone.timing };
}

// Retries from the same checkout use the same order and reserve only once.
export async function reserveOrder(uid: string, body: any, online: boolean) {
  const input = orderInput(body);
  const config = await settings();
  const delivery = deliveryQuote(config, body.deliveryZone);
  const key = body.checkoutId;
  if (typeof key !== 'string' || !/^[\w-]{8,100}$/.test(key)) throw new CheckoutError('A checkout ID is required');
  const id = createHash('sha256').update(`${uid}:${key}`).digest('hex').slice(0, 32);
  const orderRef = db.doc(`users/${uid}/orders/${id}`);
  const reference = `jat-${id}`;
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...input, zone: body.deliveryZone, online })).digest('hex');
  const order: any = await db.runTransaction(async tx => {
    const existing = await tx.get(orderRef);
    if (existing.exists) {
      const data = existing.data()!;
      if (data.fingerprint !== fingerprint) throw new CheckoutError('Checkout changed. Start a new checkout.', 409);
      if (data.inventory_state === 'released' || data.payment_status === 'refunded') throw new CheckoutError('This checkout has expired. Start a new checkout.', 409);
      return data;
    }
    const refs = input.items.map(item => db.doc(`products/${item.productId}`));
    const products = await tx.getAll(...refs);
    const costDocs = await tx.getAll(...input.items.map(item => db.doc(`product_costs/${item.productId}`)));
    const quote = quoteItems(input.items, Object.fromEntries(products.map(doc => [doc.id, doc.data()])), delivery);
    const hasCosts = costDocs.every(doc => Number.isFinite(doc.data()?.cost));
    const cost = hasCosts ? costDocs.reduce((sum, doc, i) => sum + Math.round(doc.data()!.cost * 100) * input.items[i].quantity, 0) / 100 : null;
    const data = { ...quote, user_id: uid, shipping_address: input.shipping_address, phone: input.phone,
      delivery_zone: delivery.zone.name, delivery_timing: delivery.zone.timing, return_days: config.returnDays, return_terms: config.returnTerms,
      status: 'pending', payment_status: 'awaiting_payment', paystack_ref: online ? reference : null,
      inventory_state: 'reserved', fingerprint,
      acquisition_source: typeof body.acquisitionSource === 'string' ? body.acquisitionSource.slice(0, 100) : 'direct',
      history: [{ status: 'pending', at: new Date().toISOString(), note: 'Stock reserved; awaiting payment' }],
      expires_at: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), created_at: Timestamp.now() };
    products.forEach((doc, i) => tx.update(doc.ref, { stock: doc.data()!.stock - input.items[i].quantity, reserved: (doc.data()?.reserved || 0) + input.items[i].quantity }));
    tx.set(orderRef, data);
    tx.set(db.doc(`order_costs/${id}`), { goods_cost: cost });
    tx.set(db.doc(`reservation_queue/${id}`), { user_id: uid, order_id: id, expires_at: data.expires_at });
    if (online) tx.set(db.doc(`payment_intents/${reference}`), { user_id: uid, order_id: id, reference, amount_minor: quote.amountMinor });
    return data;
  });
  return { id, ref: orderRef, reference, order };
}

// Release a reservation exactly once. Paid inventory requires an explicit refund/return decision.
export async function releaseOrder(uid: string, id: string, status = 'cancelled') {
  const ref = db.doc(`users/${uid}/orders/${id}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const order = snap.data();
    if (!order || order.inventory_state !== 'reserved' || order.payment_status !== 'awaiting_payment') return;
    const products = await tx.getAll(...order.items.map((line: any) => db.doc(`products/${line.product_id}`)));
    products.forEach((doc, i) => { const data = doc.data() as any; if (doc.exists) tx.update(doc.ref, { stock: data.stock + order.items[i].quantity, reserved: Math.max(0, (data.reserved || 0) - order.items[i].quantity) }); });
    tx.update(ref, { status, inventory_state: 'released', updated_at: FieldValue.serverTimestamp(), history: FieldValue.arrayUnion({ status, at: new Date().toISOString(), note: status === 'expired' ? 'Payment window expired; stock released' : 'Order cancelled; stock released' }) });
    tx.delete(db.doc(`reservation_queue/${id}`));
  });
}

export const getOrders = functions.https.onRequest(async (req, res) => {
  await verifyAuth(req, res, async () => {
    try {
      const snap = await db.collection(`users/${(req as any).user.uid}/orders`).orderBy('created_at', 'desc').get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { checkoutFailure(res, err); }
  });
});

export const createOrder = functions.https.onRequest(async (req, res) => {
  await verifyAuth(req, res, async () => {
    try {
      const result = await reserveOrder((req as any).user.uid, req.body, false);
      res.status(201).json({ id: result.id, status: result.order.status, total: result.order.total });
    } catch (err) { checkoutFailure(res, err); }
  });
});

export async function orderAction(req: functions.https.Request, res: functions.Response) {
  await verifyAuth(req, res, async () => {
    try {
      const uid = (req as any).user.uid, id = String(req.query.id);
      if (!/^[\w-]{1,128}$/.test(id)) throw new CheckoutError('Invalid order');
      const ref = db.doc(`users/${uid}/orders/${id}`);
      const order = (await ref.get()).data();
      if (!order) throw new CheckoutError('Order not found', 404);
      if (req.body.action === 'cancel') {
        if (order.payment_status !== 'awaiting_payment') throw new CheckoutError('Contact support to cancel a paid order', 409);
        await releaseOrder(uid, id);
      } else if (req.body.action === 'help') {
        if (typeof req.body.message !== 'string' || req.body.message.trim().length < 5 || req.body.message.length > 2000) throw new CheckoutError('Describe the problem in 5–2000 characters');
        await ref.update({ help_request: req.body.message.trim(), help_status: 'open', help_requested_at: FieldValue.serverTimestamp() });
      } else throw new CheckoutError('Invalid order action');
      res.json({ success: true });
    } catch (err) { checkoutFailure(res, err); }
  });
}

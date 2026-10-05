import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from './firebase';
import { verifyAuth } from './middleware';
import { reserveOrder, releaseOrder, checkoutFailure } from './orders';
import { CheckoutError, assertPayment } from './checkout';

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new CheckoutError('Online payment is not configured yet. Contact support for help.', 503);
  return key;
}

export async function paystack(path: string, body?: unknown) {
  // A local provider stub is allowed only in the isolated Firebase emulator.
  const base = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.PAYSTACK_API_URL?.startsWith('http://127.0.0.1:')
    ? process.env.PAYSTACK_API_URL : 'https://api.paystack.co';
  const response = await fetch(`${base}/${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as any;
  if (!response.ok || !result.status) throw new CheckoutError('Payment provider could not process the request', response.status === 404 ? 404 : 502);
  return result.data;
}

export async function settlePayment(payment: any) {
  const reference = payment?.reference;
  if (typeof reference !== 'string' || !/^jat-[a-f0-9]{32}$/.test(reference)) throw new CheckoutError('Invalid payment reference');
  const intentRef = db.doc(`payment_intents/${reference}`);
  const intent = (await intentRef.get()).data();
  if (!intent) throw new CheckoutError('Payment not found', 404);
  assertPayment(payment, intent, intent.user_id);
  const ref = db.doc(`users/${intent.user_id}/orders/${intent.order_id}`);
  const status = await db.runTransaction(async tx => {
    const snap = await tx.get(ref), order = snap.data();
    if (!order) throw new CheckoutError('Order not found', 404);
    if (order.payment_status === 'paid' || order.payment_status === 'refunded') return order.status;
    const lines = order.items || [];
    const cartDocs = await tx.getAll(...lines.map((line: any) => db.doc(`users/${intent.user_id}/cart/${line.product_id}`)));
    const productDocs = await tx.getAll(...lines.map((line: any) => db.doc(`products/${line.product_id}`)));
    const reserved = order.inventory_state === 'reserved';
    const nextStatus = reserved ? 'paid' : 'payment_review';
    if (reserved) productDocs.forEach((doc, i) => { if (doc.exists) tx.update(doc.ref, { reserved: Math.max(0, ((doc.data() as any)?.reserved || 0) - lines[i].quantity) }); });
    cartDocs.forEach((doc, i) => {
      if (!doc.exists) return;
      const remaining = ((doc.data() as any)?.quantity || 0) - lines[i].quantity;
      if (remaining > 0) tx.set(doc.ref, { quantity: remaining }); else tx.delete(doc.ref);
    });
    tx.update(ref, { status: nextStatus, payment_status: 'paid', inventory_state: reserved ? 'committed' : 'released',
      paid_at: FieldValue.serverTimestamp(),
      payment_channel: payment.channel || null,
      history: FieldValue.arrayUnion({ status: nextStatus, at: new Date().toISOString(), note: reserved ? 'Payment confirmed' : 'Payment arrived after stock was released. Support will arrange a refund.' }) });
    tx.update(intentRef, { verified: true });
    tx.set(db.doc(`order_costs/${intent.order_id}`), { payment_fee: Number.isFinite(payment.fees) ? payment.fees / 100 : null }, { merge: true });
    tx.delete(db.doc(`reservation_queue/${intent.order_id}`));
    return nextStatus;
  });
  return { success: true, orderId: intent.order_id, status };
}

export const initializePayment = functions.https.onRequest(async (req, res) => {
  await verifyAuth(req, res, async () => {
    try {
      secretKey();
      const { uid, email } = (req as any).user;
      if (!email) throw new CheckoutError('An email account is required');
      const result = await reserveOrder(uid, req.body, true);
      if (result.order.payment_status === 'paid') { res.json({ orderId: result.id, paid: true }); return; }
      if (result.order.authorization_url) { res.json({ authorization_url: result.order.authorization_url, reference: result.reference, orderId: result.id, total: result.order.total }); return; }
      // Claim initialization before calling the provider to avoid concurrent duplicate calls.
      const claimed = await db.runTransaction(async tx => {
        const snap = await tx.get(result.ref);
        if (snap.data()?.initializing) return false;
        tx.update(result.ref, { initializing: true }); return true;
      });
      if (!claimed) throw new CheckoutError('Payment is being prepared. Check your order history before trying again.', 409);
      try {
        const data = await paystack('transaction/initialize', { email, amount: String(result.order.amountMinor), currency: 'GHS', reference: result.reference,
          channels: ['card', 'mobile_money'], callback_url: `${process.env.STOREFRONT_URL || 'https://jack-of-all-trades-marketplace.web.app'}/checkout`,
          metadata: JSON.stringify({ user_id: uid, order_id: result.id }) });
        if (typeof data.authorization_url !== 'string' || !/^https:\/\/checkout\.paystack\.com\//.test(data.authorization_url)) throw new CheckoutError('Invalid payment destination', 502);
        await result.ref.update({ authorization_url: data.authorization_url, initializing: false });
        res.json({ ...data, orderId: result.id, total: result.order.total });
      } catch (err) {
        // A timeout may have created a provider transaction. Keep the reference and reservation for reconciliation.
        await result.ref.update({ payment_initialization_error: true });
        throw err;
      }
    } catch (err) { checkoutFailure(res, err); }
  });
});

export const verifyPayment = functions.https.onRequest(async (req, res) => {
  await verifyAuth(req, res, async () => {
    try {
      const reference = req.query.reference;
      if (typeof reference !== 'string' || !/^jat-[a-f0-9]{32}$/.test(reference)) throw new CheckoutError('Invalid payment reference');
      const intent = (await db.doc(`payment_intents/${reference}`).get()).data();
      if (!intent || intent.user_id !== (req as any).user.uid) throw new CheckoutError('Payment not found', 404);
      const payment = await paystack(`transaction/verify/${encodeURIComponent(reference)}`);
      if (payment.status !== 'success') throw new CheckoutError('Payment is not confirmed yet. Approve the mobile money prompt, then check again.', 409);
      res.json(await settlePayment(payment));
    } catch (err) { checkoutFailure(res, err); }
  });
});

export function validSignature(raw: Buffer, signature: unknown, key: string) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha512', key).update(raw).digest());
}

export async function applyRefund(data: any, event: string) {
  const reference = typeof data.transaction === 'string' ? data.transaction : data.transaction?.reference;
  // The provider refund ID is recorded before accepting state updates.
  let intent = reference ? (await db.doc(`payment_intents/${reference}`).get()).data() : null;
  if (!intent && data.id != null) intent = (await db.collection('payment_intents').where('refund_id', '==', String(data.id)).limit(1).get()).docs[0]?.data();
  if (!intent) return;
  const ref = db.doc(`users/${intent.user_id}/orders/${intent.order_id}`);
  await db.runTransaction(async tx => {
    const order = (await tx.get(ref)).data();
    if (!order || String(order.refund_id) !== String(data.id) || data.currency !== 'GHS' || data.amount !== Math.round(order.total * 100)) throw new CheckoutError('Refund does not match the order', 409);
    if (order.refund_status === 'processed') return;
    const state = event.replace('refund.', '');
    if (!['processed', 'pending', 'processing', 'failed'].includes(state)) return;
    const update: any = { refund_status: state, updated_at: FieldValue.serverTimestamp() };
    if (state === 'processed') Object.assign(update, { status: 'refunded', payment_status: 'refunded', refunded_amount: order.total,
      history: FieldValue.arrayUnion({ status: 'refunded', at: new Date().toISOString(), note: 'Full refund confirmed by the payment provider' }) });
    tx.update(ref, update);
  });
}

export async function paymentWebhook(req: functions.https.Request, res: functions.Response) {
  try {
    if (!validSignature(req.rawBody, req.headers['x-paystack-signature'], secretKey())) { res.status(401).json({ error: 'Invalid signature' }); return; }
    const event = req.body;
    if (event.event === 'charge.success') await settlePayment(event.data);
    else if (String(event.event).startsWith('refund.')) await applyRefund(event.data, event.event);
    res.json({ received: true });
  } catch (err) { checkoutFailure(res, err); }
}

export async function expireReservations() {
  const snap = await db.collection('reservation_queue').where('expires_at', '<=', new Date()).limit(100).get();
  for (const doc of snap.docs) {
    const { user_id, order_id } = doc.data();
    const order = (await db.doc(`users/${user_id}/orders/${order_id}`).get()).data();
    if (!order || order.inventory_state !== 'reserved') { await doc.ref.delete(); continue; }
    try {
      if (order.paystack_ref) {
        const payment = await paystack(`transaction/verify/${encodeURIComponent(order.paystack_ref)}`);
        if (payment.status === 'success') { await settlePayment(payment); continue; }
        // Mobile money authorization may still be processing. Keep stock until a later run.
        if (['ongoing', 'pending', 'processing', 'queued'].includes(payment.status) && order.expires_at.toMillis() > Date.now() - 24 * 60 * 60 * 1000) continue;
      }
      await releaseOrder(user_id, order_id, 'expired');
    } catch (err) {
      if (err instanceof CheckoutError && err.status === 404) await releaseOrder(user_id, order_id, 'expired');
      else functions.logger.error('Reservation reconciliation needs retry', { order_id, error: String(err) });
    }
  }
}

import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase';
import { verifyAuth } from './middleware';
import { CheckoutError } from './checkout';
import { checkoutFailure, releaseOrder } from './orders';
import { paystack, applyRefund } from './payments';
import { validateSettings } from './settings';

export const transitions: Record<string, string[]> = {
  paid: ['processing'], processing: ['out_for_delivery'], out_for_delivery: ['delivered'], shipped: ['delivered'],
};

export function metrics(orders: any[], marketingSpend: number) {
  const delivered = orders.filter(o => o.status === 'delivered' || o.delivered_at);
  const buyers = new Map<string, number>();
  delivered.forEach(o => buyers.set(o.user_id, (buyers.get(o.user_id) || 0) + 1));
  const retained = new Map<string, number>();
  delivered.filter(o => o.payment_status !== 'refunded').forEach(o => retained.set(o.user_id, (retained.get(o.user_id) || 0) + 1));
  const completedCosts = orders.filter(o => ['delivered', 'refunded', 'cancelled'].includes(o.status)
    && ['paid', 'refunded'].includes(o.payment_status));
  const costed = completedCosts.filter(o => [o.goods_cost, o.payment_fee, o.delivery_cost, o.support_cost, o.refund_cost, o.goods_recovered].every(Number.isFinite));
  const contribution = costed.reduce((sum, o) => sum + o.total - o.tax - (o.refunded_amount || 0) - o.goods_cost + o.goods_recovered - o.payment_fee - o.delivery_cost - o.support_cost - o.refund_cost, 0);
  return { orders: orders.length, delivered: delivered.length, cancellations: orders.filter(o => ['cancelled', 'expired'].includes(o.status)).length,
    refunds: orders.filter(o => o.payment_status === 'refunded').length, customers: buyers.size,
    repeatCustomers: [...retained.values()].filter(n => n > 1).length, repeatRate: buyers.size ? [...retained.values()].filter(n => n > 1).length / buyers.size : 0,
    marketingSpend, cac: buyers.size ? marketingSpend / buyers.size : null,
    costedOrders: costed.length, missingCosts: completedCosts.length - costed.length,
    contribution: Math.round(contribution * 100) / 100, contributionPerOrder: costed.length ? Math.round(contribution * 100 / costed.length) / 100 : null };
}

export async function operations(req: functions.https.Request, res: functions.Response) {
  await verifyAuth(req, res, async () => {
    try {
      if ((req as any).user.admin !== true) throw new CheckoutError('Admin approval required', 403);
      const action = String(req.query.action || 'summary');
      if (action === 'summary' && req.method === 'GET') {
        const [orderDocs, costs, orderCosts] = await Promise.all([
          db.collectionGroup('orders').limit(501).get(), db.doc('shop_private/costs').get(), db.collection('order_costs').get(),
        ]);
        const costMap = Object.fromEntries(orderCosts.docs.map(doc => [doc.id, doc.data()]));
        const orders = orderDocs.docs.slice(0, 500).map(doc => ({ id: doc.id, ...doc.data(), ...(costMap[doc.id] || {}) })).sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        res.json({ orders, metrics: metrics(orders, costs.data()?.marketingSpend || 0), truncated: orderDocs.size > 500 }); return;
      }
      if (action === 'settings') {
        await db.doc('shop/settings').set(validateSettings(req.body)); res.json({ success: true }); return;
      }
      if (action === 'marketing') {
        const spend = req.body.marketingSpend;
        if (!Number.isFinite(spend) || spend < 0 || spend > 10000000) throw new CheckoutError('Enter total acquisition spend in GHS');
        await db.doc('shop_private/costs').set({ marketingSpend: spend }); res.json({ success: true }); return;
      }
      if (action === 'seller') {
        const { uid, requestId, status, notes } = req.body;
        if (!/^[\w-]{1,128}$/.test(uid) || !/^[\w-]{1,128}$/.test(requestId) || !['approved', 'rejected', 'suspended'].includes(status)) throw new CheckoutError('Invalid seller decision');
        const ref = db.doc(`users/${uid}/seller_requests/${requestId}`), application = (await ref.get()).data();
        if (!application) throw new CheckoutError('Application not found', 404);
        const batch = db.batch();
        batch.update(ref, { status, reviewed_at: FieldValue.serverTimestamp() });
        batch.set(db.doc(`seller_profiles/${uid}`), { status, name: application.fullName, phone: application.phone, email: application.email,
          notes: String(notes || '').slice(0, 2000), reviewed_at: FieldValue.serverTimestamp() }, { merge: true });
        await batch.commit(); res.json({ success: true }); return;
      }
      const { uid, orderId } = req.body;
      if (!/^[\w-]{1,128}$/.test(uid) || !/^[\w-]{1,128}$/.test(orderId)) throw new CheckoutError('Invalid order');
      const ref = db.doc(`users/${uid}/orders/${orderId}`);
      if (action === 'update') {
        await db.runTransaction(async tx => {
          const order = (await tx.get(ref)).data();
          if (!order) throw new CheckoutError('Order not found', 404);
          const update: any = { updated_at: FieldValue.serverTimestamp() };
          const costUpdate: any = {};
          if (req.body.status && req.body.status !== order.status) {
            if (order.payment_status !== 'paid' || order.refund_status || !transitions[order.status]?.includes(req.body.status)) throw new CheckoutError('This order cannot move to that status', 409);
            update.status = req.body.status;
            update.history = FieldValue.arrayUnion({ status: req.body.status, at: new Date().toISOString(), note: String(req.body.note || '').slice(0, 1000) });
            if (req.body.status === 'delivered') update.delivered_at = FieldValue.serverTimestamp();
          }
          for (const key of ['delivery_cost', 'support_cost', 'refund_cost', 'goods_recovered', 'goods_cost', 'payment_fee']) {
            if (req.body[key] !== undefined) {
              if (!Number.isFinite(req.body[key]) || req.body[key] < 0 || req.body[key] > 10000000) throw new CheckoutError('Costs must be nonnegative amounts in GHS');
              costUpdate[key] = Math.round(req.body[key] * 100) / 100;
            }
          }
          if (req.body.note !== undefined) update.delivery_note = String(req.body.note).slice(0, 1000);
          if (req.body.help_status) {
            if (!['open', 'resolved'].includes(req.body.help_status)) throw new CheckoutError('Invalid support status');
            update.help_status = req.body.help_status;
          }
          tx.update(ref, update);
          if (Object.keys(costUpdate).length) tx.set(db.doc(`order_costs/${orderId}`), costUpdate, { merge: true });
        });
      } else if (action === 'cancel') await releaseOrder(uid, orderId);
      else if (action === 'refund') {
        const order = await db.runTransaction(async tx => {
          const data = (await tx.get(ref)).data();
          if (!data || data.payment_status !== 'paid' || data.refund_status) throw new CheckoutError('Only a paid order without an existing refund can be refunded', 409);
          if (typeof req.body.reason !== 'string' || req.body.reason.trim().length < 5) throw new CheckoutError('Enter a refund reason');
          tx.update(ref, { refund_status: 'submitting', refund_reason: req.body.reason.slice(0, 1000), refund_previous_status: data.status });
          return data;
        });
        try {
          const refund = await paystack('refund', { transaction: order.paystack_ref, amount: Math.round(order.total * 100), currency: 'GHS', merchant_note: req.body.reason.slice(0, 1000) });
          if (refund.id == null || refund.amount !== Math.round(order.total * 100) || refund.currency !== 'GHS') throw new CheckoutError('Refund response requires reconciliation', 502);
          await db.runTransaction(async tx => {
            const current = (await tx.get(ref)).data();
            tx.update(ref, { ...(current?.refund_status === 'processed' ? {} : { status: 'refund_pending', refund_status: 'pending' }), refund_id: String(refund.id) });
            tx.update(db.doc(`payment_intents/${order.paystack_ref}`), { refund_id: String(refund.id) });
          });
          if (refund.status === 'processed') await applyRefund(refund, 'refund.processed');
        } catch (err) {
          await db.runTransaction(async tx => {
            const current = (await tx.get(ref)).data();
            if (current?.refund_status !== 'processed') tx.update(ref, { refund_status: 'unknown' });
          }); throw err;
        }
      } else if (action === 'refund-sync') {
        const order = (await ref.get()).data();
        if (!order?.refund_status) throw new CheckoutError('No refund to reconcile');
        const refundId = order.refund_id || req.body.refundId;
        if (!/^\d+$/.test(String(refundId))) throw new CheckoutError('Enter the refund ID from the Paystack dashboard');
        const refund = await paystack(`refund/${refundId}`);
        const reference = typeof refund.transaction === 'string' ? refund.transaction : refund.transaction?.reference;
        // Fetch Refund may return a numeric transaction ID. Match it to the verified charge.
        if (reference !== order.paystack_ref) {
          const payment = await paystack(`transaction/verify/${encodeURIComponent(order.paystack_ref)}`);
          const transactionId = typeof refund.transaction === 'object' ? refund.transaction?.id : refund.transaction;
          if (String(transactionId) !== String(payment.id) || payment.reference !== order.paystack_ref) throw new CheckoutError('Refund does not match this transaction');
        }
        if (String(refund.id) !== String(refundId) || refund.currency !== 'GHS' || refund.amount !== Math.round(order.total * 100)) throw new CheckoutError('Refund does not match this order');
        await db.runTransaction(async tx => {
          const current = (await tx.get(ref)).data();
          tx.update(ref, { refund_id: String(refund.id), ...(current?.refund_status === 'processed' ? {} : { status: 'refund_pending' }) });
          tx.update(db.doc(`payment_intents/${order.paystack_ref}`), { refund_id: String(refund.id) });
        });
        await applyRefund(refund, `refund.${refund.status}`);
      } else if (action === 'restock') {
        // Operator must physically verify returned stock; refunds alone never restock goods.
        await db.runTransaction(async tx => {
          const order = (await tx.get(ref)).data();
          const costs = (await tx.get(db.doc(`order_costs/${orderId}`))).data();
          if (!order || order.inventory_state !== 'committed' || !order.refund_status || req.body.confirmReturned !== true) throw new CheckoutError('Confirm that returned goods were received and checked');
          const docs = await tx.getAll(...order.items.map((line: any) => db.doc(`products/${line.product_id}`)));
          if (docs.some(doc => !doc.exists)) throw new CheckoutError('A listing was removed. Restore it before restocking.');
          docs.forEach((doc, i) => tx.update(doc.ref, { stock: (doc.data() as any).stock + order.items[i].quantity }));
          tx.update(ref, { inventory_state: 'released', restocked_at: FieldValue.serverTimestamp() });
          tx.set(db.doc(`order_costs/${orderId}`), { goods_recovered: costs?.goods_cost ?? null }, { merge: true });
        });
      } else throw new CheckoutError('Unknown admin action');
      res.json({ success: true });
    } catch (err) { checkoutFailure(res, err); }
  });
}

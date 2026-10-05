import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase';
import { verifyAuth } from './middleware';
import { CheckoutError } from './checkout';
import { checkoutFailure } from './orders';

export function listingInput(body: any) {
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 180 || typeof body.category !== 'string'
    || !/^[\w-]{1,80}$/.test(body.category) || !Number.isFinite(body.price) || body.price <= 0 || body.price > 1000000
    || !Number.isInteger(body.stock) || body.stock < 0 || body.stock > 100000 || typeof body.description !== 'string'
    || !body.description.trim() || body.description.length > 5000 || !['new', 'like-new', 'used'].includes(body.condition)
    || typeof body.image !== 'string' || body.image.length > 500000 || (!/^https:\/\//.test(body.image) && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.image))
    || !Array.isArray(body.specs) || body.specs.length > 30 || body.specs.some((s: any) => typeof s !== 'string' || s.length > 200)) throw new CheckoutError('Enter complete item details, condition, stock, price, and a photo under 350 KB');
  return { name: body.name.trim(), category: body.category, price: Math.round(body.price * 100) / 100, stock: body.stock,
    description: body.description.trim(), condition: body.condition, image: body.image, specs: body.specs };
}

export async function sellerApi(req: functions.https.Request, res: functions.Response) {
  await verifyAuth(req, res, async () => {
    try {
      const uid = (req as any).user.uid, admin = (req as any).user.admin === true;
      const profile = (await db.doc(`seller_profiles/${uid}`).get()).data();
      if (!admin && profile?.status !== 'approved') throw new CheckoutError('Your seller account needs approval', 403);
      const action = String(req.query.action || 'dashboard');
      if (action === 'dashboard') {
        const orders = await db.collectionGroup('orders').limit(500).get();
        res.json({ profile,
          orders: orders.docs.flatMap(doc => {
            const order = doc.data(), lines = order.items?.filter((line: any) => line.seller_id === uid);
            return lines?.length && ['paid', 'processing', 'out_for_delivery', 'delivered'].includes(order.status) ? [{ id: doc.id, uid: order.user_id, status: order.status, items: lines,
              ready: order.seller_ready?.[uid] === true, created_at: order.created_at }] : [];
          }) }); return;
      }
      if (action === 'ready') {
        const { orderId, customerId } = req.body;
        if (!/^[\w-]{1,128}$/.test(orderId) || !/^[\w-]{1,128}$/.test(customerId)) throw new CheckoutError('Invalid order');
        const ref = db.doc(`users/${customerId}/orders/${orderId}`);
        await db.runTransaction(async tx => {
          const order = (await tx.get(ref)).data();
          if (!order?.items.some((line: any) => line.seller_id === uid) || !['paid', 'processing'].includes(order.status)) throw new CheckoutError('Order is not available for preparation');
          tx.update(ref, { [`seller_ready.${uid}`]: true });
        }); res.json({ success: true }); return;
      }
      const id = req.body.id;
      if (id && !/^[\w-]{1,128}$/.test(id)) throw new CheckoutError('Invalid listing');
      if (action === 'publish' && admin) {
        if (!id) throw new CheckoutError('Choose a listing submission');
        const ref = db.doc(`listing_submissions/${id}`), productRef = db.doc(`products/${id}`);
        if (req.body.checked !== true) throw new CheckoutError('Check stock, photos, condition, and pricing before publishing');
        await db.runTransaction(async tx => {
          const draft = (await tx.get(ref)).data();
          if (!draft) throw new CheckoutError('Listing submission not found', 404);
          const seller = (await tx.get(db.doc(`seller_profiles/${draft.seller_id}`))).data();
          const existing = (await tx.get(productRef)).data();
          if (seller?.status !== 'approved') throw new CheckoutError('Supplier is not approved');
          if ((existing?.reserved || 0) > 0) throw new CheckoutError('This item has reserved stock. Finish pending orders before replacing its quantity.', 409);
          tx.set(productRef, { ...listingInput(draft), seller_id: draft.seller_id, active: true, status: 'active', verified: true,
            rating: existing?.rating || 0, review_count: existing?.review_count || 0, review_sum: existing?.review_sum || 0,
            created_at: existing?.created_at || FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
          tx.update(ref, { status: 'published' });
        }); res.json({ success: true }); return;
      }
      if (action !== 'save') throw new CheckoutError('Unknown seller action');
      const data = listingInput(req.body);
      const target = admin ? db.collection('products') : db.collection('listing_submissions');
      const ref = id ? target.doc(id) : target.doc();
      if (admin && req.body.checked !== true) throw new CheckoutError('Confirm stock, photos, condition, and price checks');
      if (admin && req.body.cost !== undefined && (!Number.isFinite(req.body.cost) || req.body.cost < 0)) throw new CheckoutError('Enter a valid supplier cost');
      await db.runTransaction(async tx => {
        const existing = (await tx.get(ref)).data();
        const published = !admin && id ? (await tx.get(db.doc(`products/${id}`))).data() : null;
        const currentProfile = !admin ? (await tx.get(db.doc(`seller_profiles/${uid}`))).data() : null;
        if (!admin && currentProfile?.status !== 'approved') throw new CheckoutError('Your seller account needs approval', 403);
        if (!admin && ((existing && existing.seller_id !== uid) || (published && published.seller_id !== uid))) throw new CheckoutError('This listing belongs to another seller', 403);
        if (admin && (existing?.reserved || 0) > 0) throw new CheckoutError('This item has reserved stock. Finish pending orders before editing its quantity.', 409);
        const values: any = { ...data, seller_id: existing?.seller_id || published?.seller_id || uid,
          status: admin ? (req.body.active === false ? 'hidden' : 'active') : 'pending', active: admin && req.body.active !== false,
          updated_at: FieldValue.serverTimestamp(), created_at: existing?.created_at || FieldValue.serverTimestamp() };
        if (admin) Object.assign(values, { verified: true, rating: existing?.rating || 0, review_count: existing?.review_count || 0, review_sum: existing?.review_sum || 0 });
        tx.set(ref, values, { merge: true });
        if (admin && req.body.cost !== undefined) tx.set(db.doc(`product_costs/${ref.id}`), { cost: Math.round(req.body.cost * 100) / 100 });
      }); res.json({ id: ref.id, success: true });
    } catch (err) { checkoutFailure(res, err); }
  });
}

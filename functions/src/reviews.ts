import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase';
import { verifyAuth } from './middleware';
import { checkoutFailure } from './orders';
import { CheckoutError } from './checkout';

export async function reviewApi(req: functions.https.Request, res: functions.Response) {
  const productId = String(req.query.id);
  if (!/^[\w-]{1,128}$/.test(productId)) { res.status(400).json({ error: 'Invalid product' }); return; }
  if (req.method === 'GET') {
    try {
      const snap = await db.collection(`products/${productId}/reviews`).limit(100).get();
      res.json({ reviews: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    } catch (err) { checkoutFailure(res, err); } return;
  }
  await verifyAuth(req, res, async () => {
    try {
      const uid = (req as any).user.uid, { orderId, rating, comment } = req.body;
      if (!/^[\w-]{1,128}$/.test(orderId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.trim().length < 3 || comment.length > 1000) throw new CheckoutError('Choose 1–5 stars and write a short review');
      await db.runTransaction(async tx => {
        const productRef = db.doc(`products/${productId}`), reviewRef = productRef.collection('reviews').doc(uid);
        const [order, product, existing] = await tx.getAll(db.doc(`users/${uid}/orders/${orderId}`), productRef, reviewRef);
        if (order.data()?.status !== 'delivered' || !order.data()?.items.some((line: any) => line.product_id === productId)) throw new CheckoutError('Reviews require a delivered purchase', 403);
        if (!product.exists) throw new CheckoutError('Product not found', 404);
        if (existing.exists) throw new CheckoutError('You have already reviewed this product', 409);
        const count = (product.data()?.review_count || 0) + 1, sum = (product.data()?.review_sum || 0) + rating;
        tx.set(reviewRef, { rating, comment: comment.trim(), verified_purchase: true, created_at: FieldValue.serverTimestamp() });
        tx.update(productRef, { rating: sum / count, review_count: count, review_sum: sum });
      }); res.json({ success: true });
    } catch (err) { checkoutFailure(res, err); }
  });
}

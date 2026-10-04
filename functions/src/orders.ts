import * as functions from "firebase-functions/v1";
import { FieldValue } from "firebase-admin/firestore";
import corsMiddleware from "cors";
import { db } from "./firebase";
import { verifyAuth } from "./middleware";
import { CheckoutError, validateItems, quoteItems } from "./checkout";

const cors = corsMiddleware({ origin: true });

export async function prepareOrder(uid: string, body: any) {
  const items = validateItems(body?.items);
  const shippingAddress = body?.shippingAddress;
  if (typeof shippingAddress !== "string" || shippingAddress.trim().length < 5 || shippingAddress.length > 1000) {
    throw new CheckoutError("Enter a full shipping address");
  }
  const docs = await db.getAll(...items.map((item) => db.collection("products").doc(item.productId)));
  const products = Object.fromEntries(docs.map((doc) => [doc.id, doc.exists ? doc.data() : null]));
  return { ...quoteItems(items, products), user_id: uid, shipping_address: shippingAddress.trim() };
}

export function checkoutFailure(res: functions.Response, err: unknown) {
  if (err instanceof CheckoutError) { res.status(err.status).json({ error: err.message }); }
  else { functions.logger.error("Checkout failed", err); res.status(500).json({ error: "Checkout is temporarily unavailable" }); }
}

export const getOrders = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const snapshot = await db.collection("users").doc((req as any).user.uid)
          .collection("orders").orderBy("created_at", "desc").get();
        res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) { checkoutFailure(res, err); }
    });
  });
});

// An unpaid request is never represented as a completed payment.
export const createOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const uid = (req as any).user.uid;
        const quote = await prepareOrder(uid, req.body);
        const orderRef = db.collection("users").doc(uid).collection("orders").doc();
        await orderRef.set({ ...quote, status: "pending", paystack_ref: null,
          created_at: FieldValue.serverTimestamp() });
        res.status(201).json({ id: orderRef.id, status: "pending", total: quote.total });
      } catch (err) { checkoutFailure(res, err); }
    });
  });
});

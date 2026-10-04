import * as functions from "firebase-functions/v1";
import { FieldValue } from "firebase-admin/firestore";
import corsMiddleware from "cors";
import { db } from "./firebase";
import { verifyAuth } from "./middleware";
import { prepareOrder, checkoutFailure } from "./orders";
import { CheckoutError, assertPayment } from "./checkout";

const cors = corsMiddleware({ origin: true });

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new CheckoutError("Online payment is not configured. You can submit an unpaid order request.", 503);
  return key;
}

async function paystack(path: string, body?: unknown) {
  const response = await fetch(`https://api.paystack.co/transaction/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as any;
  if (!response.ok || !result.status) throw new CheckoutError("Payment provider could not process the request", 502);
  return result.data;
}

export const initializePayment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        secretKey();
        const { uid, email } = (req as any).user;
        if (!email) throw new CheckoutError("An email account is required");
        const quote = await prepareOrder(uid, req.body);
        const orderRef = db.collection("users").doc(uid).collection("orders").doc();
        const reference = `jat_${orderRef.id}`;
        const intent = { user_id: uid, order_id: orderRef.id, reference, amount_minor: quote.amountMinor };
        const batch = db.batch();
        batch.set(orderRef, { ...quote, status: "pending", paystack_ref: reference,
          created_at: FieldValue.serverTimestamp() });
        batch.set(db.collection("payment_intents").doc(reference), intent);
        await batch.commit();
        const data = await paystack("initialize", {
          email, amount: quote.amountMinor, currency: "GHS", reference,
          callback_url: `${process.env.STOREFRONT_URL || "https://jack-of-all-trades-marketplace.web.app"}/checkout`,
          metadata: { user_id: uid, order_id: orderRef.id },
        });
        res.json({ ...data, orderId: orderRef.id, total: quote.total });
      } catch (err) { checkoutFailure(res, err); }
    });
  });
});

export const verifyPayment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const uid = (req as any).user.uid;
        const reference = req.query.reference;
        if (typeof reference !== "string" || !/^jat_[\w-]{1,128}$/.test(reference)) throw new CheckoutError("Invalid payment reference");
        const intentRef = db.collection("payment_intents").doc(reference);
        const intent = (await intentRef.get()).data();
        if (!intent || intent.user_id !== uid) throw new CheckoutError("Payment not found", 404);
        const payment = await paystack(`verify/${encodeURIComponent(reference)}`);
        assertPayment(payment, intent, uid);
        const orderRef = db.collection("users").doc(uid).collection("orders").doc(intent.order_id);
        await db.runTransaction(async (transaction) => {
          const order = await transaction.get(orderRef);
          if (!order.exists) throw new CheckoutError("Order not found", 404);
          if (order.data()?.status === "paid") return;
          const lines = order.data()?.items || [];
          const cartRefs = lines.map((line: any) => db.collection("users").doc(uid).collection("cart").doc(line.product_id));
          const carts = cartRefs.length ? await transaction.getAll(...cartRefs) : [];
          carts.forEach((cart, index) => {
            if (!cart.exists) return;
            const remaining = ((cart.data() as { quantity?: number } | undefined)?.quantity || 0) - lines[index].quantity;
            if (remaining > 0) transaction.set(cart.ref, { quantity: remaining });
            else transaction.delete(cart.ref);
          });
          transaction.update(orderRef, { status: "paid", paid_at: FieldValue.serverTimestamp() });
          transaction.update(intentRef, { verified: true });
        });
        res.json({ success: true, orderId: intent.order_id, status: "paid" });
      } catch (err) { checkoutFailure(res, err); }
    });
  });
});

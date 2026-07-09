import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsMiddleware from "cors";
import { verifyAuth } from "./middleware";

const cors = corsMiddleware({ origin: true });
const db = admin.firestore();

export const getOrders = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const snapshot = await db
          .collection("users").doc(userId)
          .collection("orders").orderBy("created_at", "desc").get();

        const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(orders);
      } catch (err) {
        functions.logger.error("Orders get error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const createOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const { items, total, tax, shippingAddress, paystackRef } = req.body;
        if (!items || !items.length) { res.status(400).json({ error: "items required" }); return; }

        const orderRef = db.collection("users").doc(userId).collection("orders").doc();
        await orderRef.set({
          user_id: userId,
          total,
          tax: tax || 0,
          status: "paid",
          paystack_ref: paystackRef || null,
          shipping_address: shippingAddress || "",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        const itemsBatch = db.batch();
        for (const item of items) {
          const itemRef = orderRef.collection("items").doc();
          const productDoc = await db.collection("products").doc(String(item.productId)).get();
          const product = productDoc.data();
          itemsBatch.set(itemRef, {
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
            name: product?.name || "",
            image: product?.image || "",
          });
        }
        await itemsBatch.commit();

        const cartSnapshot = await db.collection("users").doc(userId).collection("cart").get();
        const cartBatch = db.batch();
        cartSnapshot.docs.forEach((doc) => cartBatch.delete(doc.ref));
        await cartBatch.commit();

        res.status(201).json({ id: orderRef.id, success: true });
      } catch (err) {
        functions.logger.error("Order create error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

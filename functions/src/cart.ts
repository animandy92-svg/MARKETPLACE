import * as functions from "firebase-functions/v1";
import { db } from "./firebase";
import corsMiddleware from "cors";
import { verifyAuth } from "./middleware";
import { validateItems, CheckoutError } from "./checkout";
import { checkoutFailure } from "./orders";

const cors = corsMiddleware({ origin: true });


export const getCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const snapshot = await db.collection("users").doc(userId).collection("cart").get();

        const items = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const productDoc = await db.collection("products").doc(doc.id).get();
            const product = productDoc.data();
            return { product_id: doc.id, quantity: data.quantity, ...product };
          })
        );

        res.json(items);
      } catch (err) {
        functions.logger.error("Cart get error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const addToCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const { productId, quantity = 1 } = req.body;
        validateItems([{ productId, quantity }]);

        const cartRef = db.collection("users").doc(userId).collection("cart").doc(String(productId));
        await db.runTransaction(async (transaction) => {
          const existing = await transaction.get(cartRef);
          const product = await transaction.get(db.collection("products").doc(productId));
          const newQuantity = (existing.data()?.quantity || 0) + quantity;
          if (!product.exists || product.data()?.active === false || product.data()?.status === "sold" || newQuantity > 99 || newQuantity > product.data()?.stock) {
            throw new CheckoutError("Requested quantity is unavailable");
          }
          transaction.set(cartRef, { quantity: newQuantity });
        });

        res.json({ success: true });
      } catch (err) {
        checkoutFailure(res, err);
      }
    });
  });
});

export const updateCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "PUT") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const productId = req.query.productId as string;
        const { quantity } = req.body;
        if (quantity !== 0) validateItems([{ productId, quantity }]);
        else if (!/^[\w-]{1,128}$/.test(productId)) throw new CheckoutError("Invalid product");

        const cartRef = db.collection("users").doc(userId).collection("cart").doc(productId);
        if (quantity === 0) {
          await cartRef.delete();
        } else {
          const product = await db.collection("products").doc(productId).get();
          if (!product.exists || product.data()?.active === false || product.data()?.status === "sold" || quantity > product.data()?.stock) throw new CheckoutError("Requested quantity is unavailable");
          await cartRef.set({ quantity });
        }

        res.json({ success: true });
      } catch (err) {
        checkoutFailure(res, err);
      }
    });
  });
});

export const removeFromCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const productId = req.query.productId as string;
        await db.collection("users").doc(userId).collection("cart").doc(productId).delete();
        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Cart delete error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const clearCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") { res.status(405).json({ error: "Method not allowed" }); return; }
    await verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const snapshot = await db.collection("users").doc(userId).collection("cart").get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Cart clear error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

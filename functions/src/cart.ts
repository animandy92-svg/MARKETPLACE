import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsMiddleware from "cors";
import { verifyAuth } from "./middleware";

const cors = corsMiddleware({ origin: true });
const db = admin.firestore();

export const getCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
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
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const { productId, quantity = 1 } = req.body;
        if (!productId) { res.status(400).json({ error: "productId required" }); return; }

        const cartRef = db.collection("users").doc(userId).collection("cart").doc(String(productId));
        const existing = await cartRef.get();

        if (existing.exists) {
          const currentQty = existing.data()?.quantity || 0;
          await cartRef.update({ quantity: currentQty + quantity });
        } else {
          await cartRef.set({ quantity, product_id: productId });
        }

        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Cart add error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const updateCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "PUT") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const productId = req.query.productId as string;
        const { quantity } = req.body;

        const cartRef = db.collection("users").doc(userId).collection("cart").doc(productId);
        if (quantity <= 0) {
          await cartRef.delete();
        } else {
          await cartRef.update({ quantity });
        }

        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Cart update error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const removeFromCart = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
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
    verifyAuth(req, res, async () => {
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

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsMiddleware from "cors";
import { verifyAuth } from "./middleware";

const cors = corsMiddleware({ origin: true });
const db = admin.firestore();

export const getWishlist = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const snapshot = await db
          .collection("users").doc(userId)
          .collection("wishlist").orderBy("created_at", "desc").get();

        const items = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const productDoc = await db.collection("products").doc(doc.id).get();
            const product = productDoc.data();
            return { product_id: doc.id, ...product };
          })
        );

        res.json(items);
      } catch (err) {
        functions.logger.error("Wishlist get error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const addToWishlist = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const productId = req.query.productId as string;

        const productDoc = await db.collection("products").doc(productId).get();
        if (!productDoc.exists) { res.status(404).json({ error: "Product not found" }); return; }

        await db.collection("users").doc(userId).collection("wishlist").doc(productId).set({
          product_id: productId,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Wishlist add error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const removeFromWishlist = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const userId = (req as any).user.uid;
        const productId = req.query.productId as string;
        await db.collection("users").doc(userId).collection("wishlist").doc(productId).delete();
        res.json({ success: true });
      } catch (err) {
        functions.logger.error("Wishlist delete error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

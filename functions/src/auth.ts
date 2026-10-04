import * as functions from "firebase-functions/v1";
import { FieldValue } from "firebase-admin/firestore";
import corsMiddleware from "cors";
import { db } from "./firebase";
import { verifyAuth } from "./middleware";

const cors = corsMiddleware({ origin: true });

export const syncFirebaseUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    await verifyAuth(req, res, async () => {
    const { uid: firebaseUid, email } = (req as any).user;
    const name = typeof req.body?.name === "string" ? req.body.name.slice(0, 120) : "";
    if (!email) { res.status(400).json({ error: "An email account is required" }); return; }
    try {
      const userRef = db.collection("users").doc(firebaseUid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          firebase_uid: firebaseUid,
          email,
          name: name || email.split("@")[0],
          phone: "",
          role: "buyer",
          created_at: FieldValue.serverTimestamp(),
        });
      }

      const data = (await userRef.get()).data();
      res.json({ user: { id: firebaseUid, ...data } });
    } catch (err) {
      functions.logger.error("Sync error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
    });
  });
});

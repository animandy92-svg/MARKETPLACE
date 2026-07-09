import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsMiddleware from "cors";

const cors = corsMiddleware({ origin: true });
const db = admin.firestore();

export const syncFirebaseUser = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { firebaseUid, email, name } = req.body;
    if (!firebaseUid || !email) {
      res.status(400).json({ error: "firebaseUid and email are required" });
      return;
    }

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
          created_at: admin.firestore.FieldValue.serverTimestamp(),
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

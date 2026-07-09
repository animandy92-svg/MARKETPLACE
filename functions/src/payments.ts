import * as functions from "firebase-functions";
import corsMiddleware from "cors";
import { verifyAuth } from "./middleware";

const cors = corsMiddleware({ origin: true });

export const initializePayment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const { email, amount, metadata } = req.body;
        if (!email || !amount) { res.status(400).json({ error: "email and amount required" }); return; }

        const secretKey = functions.config().paystack.secret_key;
        if (!secretKey) { res.status(500).json({ error: "Paystack not configured" }); return; }

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: Math.round(amount * 100),
            currency: "GHS",
            metadata: metadata || {},
          }),
        });

        const data = await response.json();
        if (!data.status) { res.status(400).json({ error: data.message || "Payment failed" }); return; }

        res.json(data.data);
      } catch (err) {
        functions.logger.error("Payment init error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

export const verifyPayment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
    verifyAuth(req, res, async () => {
      try {
        const reference = req.query.reference as string;
        const secretKey = functions.config().paystack.secret_key;
        if (!secretKey) { res.status(500).json({ error: "Paystack not configured" }); return; }

        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );

        const data = await response.json();
        res.json(data);
      } catch (err) {
        functions.logger.error("Payment verify error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

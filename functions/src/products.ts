import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import corsMiddleware from "cors";

const cors = corsMiddleware({ origin: true });
const db = admin.firestore();

export const getProducts = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const {
        category,
        search,
        minPrice,
        maxPrice,
        minRating,
        inStock,
        sort,
        page = "1",
        limit = "50",
      } = req.query as Record<string, string>;

      let query: FirebaseFirestore.Query = db.collection("products");

      if (category && category !== "all") {
        query = query.where("category", "==", category);
      }
      if (inStock === "true") {
        query = query.where("stock", ">", 0);
      }
      if (minRating) {
        query = query.where("rating", ">=", parseFloat(minRating));
      }

      switch (sort) {
        case "price-low":
          query = query.orderBy("price", "asc");
          break;
        case "price-high":
          query = query.orderBy("price", "desc");
          break;
        case "rating":
          query = query.orderBy("rating", "desc");
          break;
        default:
          query = query.orderBy("name", "asc");
      }

      const snapshot = await query.get();
      let products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (search) {
        const s = search.toLowerCase();
        products = products.filter(
          (p: any) =>
            p.name.toLowerCase().includes(s) ||
            p.description.toLowerCase().includes(s)
        );
      }
      if (minPrice) {
        products = products.filter((p: any) => p.price >= parseFloat(minPrice));
      }
      if (maxPrice) {
        products = products.filter((p: any) => p.price <= parseFloat(maxPrice));
      }

      const total = products.length;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      const paginated = products.slice(offset, offset + limitNum);

      res.json({ products: paginated, total, page: pageNum, limit: limitNum });
    } catch (err) {
      functions.logger.error("Products error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

export const getProduct = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const doc = await db.collection("products").doc(req.query.id as string).get();
      if (!doc.exists) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
      functions.logger.error("Product detail error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

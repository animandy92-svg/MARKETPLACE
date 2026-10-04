import * as functions from "firebase-functions/v1";
import { db } from "./firebase";
import corsMiddleware from "cors";

const cors = corsMiddleware({ origin: true });


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

      const snapshot = await db.collection('products').get();
      let products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      products = products.filter((product: any) => product.status !== 'sold' && product.active !== false);

      if (category && category !== 'all') products = products.filter((p: any) => p.category === category);
      if (inStock === 'true') products = products.filter((p: any) => p.stock > 0);
      if (minRating) products = products.filter((p: any) => p.rating >= Number(minRating));
      products.sort((a: any, b: any) => sort === 'price-low' ? a.price - b.price
        : sort === 'price-high' ? b.price - a.price
        : sort === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name));
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
      const pageNum = Math.max(1, Math.min(100000, parseInt(page) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));
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

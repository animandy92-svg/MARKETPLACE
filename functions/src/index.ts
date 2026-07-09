import * as functions from "firebase-functions";
import corsMiddleware from "cors";

const cors = corsMiddleware({ origin: true });

export { syncFirebaseUser } from "./auth";
export { getProducts, getProduct } from "./products";
export { getCart, addToCart, updateCart, removeFromCart, clearCart } from "./cart";
export { getOrders, createOrder } from "./orders";
export { getWishlist, addToWishlist, removeFromWishlist } from "./wishlist";
export { initializePayment, verifyPayment } from "./payments";

export const api = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    // Strip /api prefix for routing
    const path = req.path.replace(/^\/api/, "") || "/";

    if (path === "/auth/firebase" && req.method === "POST") {
      const { syncFirebaseUser } = await import("./auth");
      return syncFirebaseUser(req, res);
    }
    if (path === "/products" && req.method === "GET") {
      const { getProducts } = await import("./products");
      return getProducts(req, res);
    }
    if (path.startsWith("/products/") && req.method === "GET") {
      const { getProduct } = await import("./products");
      req.query.id = path.split("/products/")[1];
      return getProduct(req, res);
    }
    if (path === "/cart" && req.method === "GET") {
      const { getCart } = await import("./cart");
      return getCart(req, res);
    }
    if (path === "/cart" && req.method === "POST") {
      const { addToCart } = await import("./cart");
      return addToCart(req, res);
    }
    if (path.startsWith("/cart/") && req.method === "PUT") {
      const { updateCart } = await import("./cart");
      req.query.productId = path.split("/cart/")[1];
      return updateCart(req, res);
    }
    if (path.startsWith("/cart/") && req.method === "DELETE") {
      const { removeFromCart } = await import("./cart");
      req.query.productId = path.split("/cart/")[1];
      return removeFromCart(req, res);
    }
    if (path === "/cart" && req.method === "DELETE") {
      const { clearCart } = await import("./cart");
      return clearCart(req, res);
    }
    if (path === "/orders" && req.method === "GET") {
      const { getOrders } = await import("./orders");
      return getOrders(req, res);
    }
    if (path === "/orders" && req.method === "POST") {
      const { createOrder } = await import("./orders");
      return createOrder(req, res);
    }
    if (path === "/wishlist" && req.method === "GET") {
      const { getWishlist } = await import("./wishlist");
      return getWishlist(req, res);
    }
    if (path.startsWith("/wishlist/") && req.method === "POST") {
      const { addToWishlist } = await import("./wishlist");
      req.query.productId = path.split("/wishlist/")[1];
      return addToWishlist(req, res);
    }
    if (path.startsWith("/wishlist/") && req.method === "DELETE") {
      const { removeFromWishlist } = await import("./wishlist");
      req.query.productId = path.split("/wishlist/")[1];
      return removeFromWishlist(req, res);
    }
    if (path === "/payments/initialize" && req.method === "POST") {
      const { initializePayment } = await import("./payments");
      return initializePayment(req, res);
    }
    if (path.startsWith("/payments/verify/") && req.method === "GET") {
      const { verifyPayment } = await import("./payments");
      req.query.reference = path.split("/payments/verify/")[1];
      return verifyPayment(req, res);
    }

    if (path === "/health" || path === "/") {
      res.json({ status: "ok" });
      return;
    }

    res.status(404).json({ error: "Not found" });
  });
});

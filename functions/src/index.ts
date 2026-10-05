import "./firebase";
import * as functions from "firebase-functions/v1";
import corsMiddleware from "cors";

const cors = corsMiddleware({ origin: true });

export const api = functions.runWith({ secrets: ['PAYSTACK_SECRET_KEY'], timeoutSeconds: 120 }).https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    // Strip /api prefix for routing
    const path = req.path.replace(/^\/api/, "") || "/";

    if (path === '/payments/webhook' && req.method === 'POST') {
      const { paymentWebhook } = await import('./payments'); return paymentWebhook(req, res);
    }
    if (path === '/settings' && req.method === 'GET') {
      try { const { settings } = await import('./settings'); res.json(await settings()); }
      catch { res.status(503).json({ error: 'Service settings unavailable' }); } return;
    }
    if (path === '/orders/quote' && req.method === 'POST') {
      const { verifyAuth } = await import('./middleware');
      const { prepareOrder, checkoutFailure } = await import('./orders');
      return verifyAuth(req, res, async () => {
        try { res.json(await prepareOrder((req as any).user.uid, req.body)); }
        catch (err) { checkoutFailure(res, err); }
      });
    }
    if (/^\/orders\/[\w-]+\/action$/.test(path) && req.method === 'POST') {
      req.query.id = path.split('/')[2]; const { orderAction } = await import('./orders'); return orderAction(req, res);
    }
    if (path.startsWith('/ops/') && (req.method === 'GET' || req.method === 'POST')) {
      req.query.action = path.slice(5); const { operations } = await import('./operations'); return operations(req, res);
    }
    if (path.startsWith('/seller/') && (req.method === 'GET' || req.method === 'POST')) {
      req.query.action = path.slice(8); const { sellerApi } = await import('./sellers'); return sellerApi(req, res);
    }
    if (/^\/reviews\/[\w-]+$/.test(path) && (req.method === 'GET' || req.method === 'POST')) {
      req.query.id = path.split('/')[2]; const { reviewApi } = await import('./reviews'); return reviewApi(req, res);
    }

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
      res.json({ status: "ok", paymentsEnabled: Boolean(process.env.PAYSTACK_SECRET_KEY), paymentMode: process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test' });
      return;
    }

    res.status(404).json({ error: "Not found" });
  });
});

export const releaseExpiredStock = functions.runWith({ secrets: ['PAYSTACK_SECRET_KEY'], timeoutSeconds: 540 }).pubsub.schedule('every 5 minutes').onRun(async () => {
  const { expireReservations } = await import('./payments'); await expireReservations();
});

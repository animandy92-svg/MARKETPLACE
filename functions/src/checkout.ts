export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validateItems(input: unknown): { productId: string; quantity: number }[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw new CheckoutError("Choose between 1 and 50 products");
  }
  const seen = new Set<string>();
  return input.map((item) => {
    if (!item || typeof item.productId !== "string" || !/^[\w-]{1,128}$/.test(item.productId)
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
      || seen.has(item.productId)) {
      throw new CheckoutError("Invalid product or quantity");
    }
    seen.add(item.productId);
    return { productId: item.productId, quantity: item.quantity };
  });
}

export function quoteItems(items: ReturnType<typeof validateItems>, products: Record<string, any>) {
  let subtotalMinor = 0;
  const lines = items.map(({ productId, quantity }) => {
    const product = products[productId];
    if (!product || product.status === 'sold' || product.active === false || !Number.isFinite(product.price) || product.price <= 0) {
      throw new CheckoutError("A product is no longer available");
    }
    if (!Number.isInteger(product.stock) || product.stock < quantity) {
      throw new CheckoutError(`${product.name || "Product"} has insufficient stock`);
    }
    const priceMinor = Math.round(product.price * 100);
    subtotalMinor += priceMinor * quantity;
    return { product_id: productId, quantity, price: priceMinor / 100,
      name: String(product.name || ""), image: String(product.image || "") };
  });
  const taxMinor = Math.round(subtotalMinor * 0.1);
  return { items: lines, subtotal: subtotalMinor / 100, tax: taxMinor / 100,
    total: (subtotalMinor + taxMinor) / 100, amountMinor: subtotalMinor + taxMinor };
}

export function assertPayment(payment: any, intent: any, uid: string) {
  if (intent.user_id !== uid || payment?.status !== "success" || payment.currency !== "GHS"
    || payment.amount !== intent.amount_minor || payment.reference !== intent.reference
    || payment.metadata?.user_id !== uid || payment.metadata?.order_id !== intent.order_id) {
    throw new CheckoutError("Payment could not be verified for this order", 409);
  }
}

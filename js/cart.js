const CART_KEY = 'techmarket_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function addToCart(product) {
  const items = getCart();
  const existing = items.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ ...product, quantity: 1 });
  }

  saveCart(items);
  showToast(`${product.name} added to cart`);
}

export function removeFromCart(productId) {
  const items = getCart().filter(item => item.id !== productId);
  saveCart(items);
}

export function updateQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  const items = getCart().map(item =>
    item.id === productId ? { ...item, quantity } : item
  );
  saveCart(items);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function getCartItems() {
  return getCart();
}

export function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartItemCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartItemCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

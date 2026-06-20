import { getCartItems, removeFromCart, updateQuantity, clearCart, getCartTotal } from './cart.js';
import { initApp } from './app.js';

function renderCartPage() {
  const main = document.querySelector('main');
  const items = getCartItems();

  if (items.length === 0) {
    main.innerHTML = `
      <div class="section container">
        <div class="empty-cart">
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <h1>Your cart is empty</h1>
          <p>Start shopping to add items to your cart</p>
          <a href="products.html" class="btn btn-primary btn-lg">Browse Products</a>
        </div>
      </div>
    `;
    return;
  }

  const total = getCartTotal();
  const tax = total * 0.1;
  const grandTotal = total + tax;

  main.innerHTML = `
    <div class="section container">
      <a href="products.html" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Continue Shopping
      </a>

      <h1 class="page-title">Shopping Cart</h1>

      <div class="cart-layout">
        <div class="cart-items">
          ${items.map(item => `
            <div class="card cart-item" data-id="${item.id}">
              <div class="cart-item-inner">
                <div class="cart-item-image">
                  <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                  <div class="cart-item-header">
                    <a href="product.html?id=${item.id}" class="cart-item-name">${item.name}</a>
                    <span class="cart-item-price">$${item.price * item.quantity}</span>
                  </div>
                  <p class="cart-item-description">${item.description}</p>
                  <div class="cart-item-actions">
                    <div class="quantity-controls">
                      <button class="btn btn-outline btn-icon quantity-btn decrease" data-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>
                      </button>
                      <span class="quantity-value">${item.quantity}</span>
                      <button class="btn btn-outline btn-icon quantity-btn increase" data-id="${item.id}" ${item.quantity >= item.stock ? 'disabled' : ''}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      </button>
                    </div>
                    <button class="btn btn-ghost btn-sm remove-btn" data-id="${item.id}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}

          <button class="btn btn-outline btn-full clear-cart-btn">Clear Cart</button>
        </div>

        <div class="cart-summary">
          <div class="card">
            <div class="card-content">
              <h2 class="card-title">Order Summary</h2>
              <hr class="separator">
              <div class="summary-lines">
                <div class="summary-line">
                  <span>Subtotal</span>
                  <span>$${total.toFixed(2)}</span>
                </div>
                <div class="summary-line">
                  <span>Shipping</span>
                  <span class="text-green">Free</span>
                </div>
                <div class="summary-line">
                  <span>Tax</span>
                  <span>$${tax.toFixed(2)}</span>
                </div>
              </div>
              <hr class="separator">
              <div class="summary-total">
                <span>Total</span>
                <span>$${grandTotal.toFixed(2)}</span>
              </div>
              <button class="btn btn-primary btn-lg btn-full checkout-btn">Proceed to Checkout</button>
              <p class="summary-note">Taxes calculated at checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  main.querySelectorAll('.decrease').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = items.find(i => i.id === id);
      if (item) updateQuantity(id, item.quantity - 1);
      renderCartPage();
    });
  });

  main.querySelectorAll('.increase').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = items.find(i => i.id === id);
      if (item) updateQuantity(id, item.quantity + 1);
      renderCartPage();
    });
  });

  main.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
      renderCartPage();
    });
  });

  main.querySelector('.clear-cart-btn').addEventListener('click', () => {
    clearCart();
    renderCartPage();
  });

  main.querySelector('.checkout-btn').addEventListener('click', () => {
    alert('Checkout functionality coming soon!');
  });
}

initApp();
renderCartPage();

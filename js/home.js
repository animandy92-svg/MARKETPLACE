import { products } from './data/products.js';
import { addToCart } from './cart.js';
import { initApp } from './app.js';

const categories = [
  {
    name: 'Phones',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
    description: 'Latest smartphones from top brands',
    link: 'products.html?category=phone',
  },
  {
    name: 'Laptops',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>`,
    description: 'Powerful laptops and tablets',
    link: 'products.html?category=laptop',
  },
  {
    name: 'Accessories',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    description: 'Enhance your tech experience',
    link: 'products.html?category=accessory',
  },
];

function renderStarRating(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      html += '<svg class="star filled" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    } else {
      html += '<svg class="star" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
  }
  return html;
}

function renderProductCard(product) {
  const lowStock = product.stock < 10;
  return `
    <a href="product.html?id=${product.id}" class="product-card">
      <div class="product-card-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${lowStock ? '<span class="badge badge-destructive">Low Stock</span>' : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-rating">
          ${renderStarRating(product.rating)}
          <span>${product.rating}</span>
        </div>
        <h3 class="product-card-title">${product.name}</h3>
        <p class="product-card-description">${product.description}</p>
      </div>
      <div class="product-card-footer">
        <span class="product-card-price">$${product.price}</span>
        <button class="btn btn-sm btn-primary add-to-cart-btn" data-product-id="${product.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          Add
        </button>
      </div>
    </a>
  `;
}

function renderHomePage() {
  const main = document.querySelector('main');
  const featuredProducts = products.slice(0, 4);

  main.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <h1>Your One-Stop Tech Shop</h1>
        <p>Discover the latest phones, laptops, and accessories at unbeatable prices</p>
        <a href="products.html" class="btn btn-primary btn-lg">
          Shop Now
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
    </section>

    <section class="section container">
      <h2 class="section-title">Shop by Category</h2>
      <div class="categories-grid">
        ${categories.map(cat => `
          <a href="${cat.link}" class="category-card">
            <div class="category-icon">${cat.icon}</div>
            <h3>${cat.name}</h3>
            <p>${cat.description}</p>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="section container">
      <div class="section-header">
        <h2 class="section-title">Featured Products</h2>
        <a href="products.html" class="btn btn-ghost">
          View All
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
      <div class="products-grid">
        ${featuredProducts.map(renderProductCard).join('')}
      </div>
    </section>
  `;

  main.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const productId = btn.dataset.productId;
      const product = products.find(p => p.id === productId);
      if (product) addToCart(product);
    });
  });
}

initApp();
renderHomePage();

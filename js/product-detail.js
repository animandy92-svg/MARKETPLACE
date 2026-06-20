import { getProductById } from './data/products.js';
import { addToCart } from './cart.js';
import { initApp } from './app.js';

function renderStarRating(rating) {
  const full = Math.floor(rating);
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      html += '<svg class="star filled" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    } else {
      html += '<svg class="star" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
  }
  return html;
}

function renderProductDetail() {
  const main = document.querySelector('main');
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const product = getProductById(productId);

  if (!product) {
    main.innerHTML = `
      <div class="section container" style="text-align: center; padding: 4rem 1rem;">
        <h1 class="page-title">Product not found</h1>
        <p style="margin: 1rem 0; color: var(--muted-foreground);">The product you're looking for doesn't exist.</p>
        <a href="products.html" class="btn btn-primary">Back to Products</a>
      </div>
    `;
    return;
  }

  const categoryLabel = {
    phone: 'Phone',
    laptop: 'Laptop & Tablet',
    accessory: 'Accessory',
  }[product.category];

  main.innerHTML = `
    <div class="section container">
      <a href="products.html" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Back to Products
      </a>

      <div class="product-detail">
        <div class="product-detail-image">
          <img src="${product.image}" alt="${product.name}">
        </div>

        <div class="product-detail-info">
          <div>
            <span class="badge badge-secondary">${categoryLabel}</span>
            <h1 class="product-detail-title">${product.name}</h1>
            <div class="product-detail-rating">
              <div class="stars">${renderStarRating(product.rating)}</div>
              <span>${product.rating} out of 5</span>
            </div>
          </div>

          <hr class="separator">

          <div>
            <p class="product-detail-price">$${product.price}</p>
            ${product.stock < 10 ? `<p class="low-stock">Only ${product.stock} left in stock!</p>` : ''}
          </div>

          <p class="product-detail-description">${product.description}</p>

          <div class="card">
            <div class="card-content">
              <h3 class="card-title">Key Features</h3>
              <ul class="specs-list">
                ${product.specs.map(spec => `
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span>${spec}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-full add-to-cart-detail" ${product.stock === 0 ? 'disabled' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.querySelector('.add-to-cart-detail').addEventListener('click', () => {
    addToCart(product);
  });
}

initApp();
renderProductDetail();

import { products, getProductsByCategory, sortProducts } from './data/products.js';
import { addToCart } from './cart.js';
import { initApp } from './app.js';

function renderStarRating(rating) {
  const full = Math.floor(rating);
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

function renderProductsPage() {
  const main = document.querySelector('main');
  const params = new URLSearchParams(window.location.search);
  let categoryFilter = params.get('category') || 'all';
  let currentSort = 'name';
  let searchQuery = '';

  function getFilteredProducts() {
    let filtered = getProductsByCategory(categoryFilter);
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortProducts(filtered, currentSort);
  }

  function render() {
    const filtered = getFilteredProducts();

    main.innerHTML = `
      <div class="section container">
        <h1 class="page-title">Products</h1>

        <div class="filters-bar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" class="input search-input" placeholder="Search products..." value="${searchQuery}" id="search-input">
          </div>

          <select class="select" id="category-select">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            <option value="phone" ${categoryFilter === 'phone' ? 'selected' : ''}>Phones</option>
            <option value="laptop" ${categoryFilter === 'laptop' ? 'selected' : ''}>Laptops</option>
            <option value="accessory" ${categoryFilter === 'accessory' ? 'selected' : ''}>Accessories</option>
          </select>

          <select class="select" id="sort-select">
            <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name</option>
            <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
            <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Rating</option>
          </select>
        </div>

        ${filtered.length > 0 ? `
          <div class="products-grid">
            ${filtered.map(renderProductCard).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <p>No products found matching your criteria.</p>
          </div>
        `}
      </div>
    `;

    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      document.getElementById('search-input').focus();
    });

    document.getElementById('category-select').addEventListener('change', (e) => {
      const value = e.target.value;
      const url = new URL(window.location);
      if (value === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', value);
      }
      window.history.pushState({}, '', url);
      categoryFilter = value;
      render();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });

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

  render();
}

initApp();
renderProductsPage();

import { getCartItemCount, updateCartBadge } from './cart.js';

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'products.html', label: 'Products' },
  { href: 'products.html?category=phone', label: 'Phones' },
  { href: 'products.html?category=laptop', label: 'Laptops' },
  { href: 'products.html?category=accessory', label: 'Accessories' },
];

function getCurrentPage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return path;
}

function renderHeader() {
  const currentPage = getCurrentPage();

  const navLinksHtml = NAV_LINKS.map(link => {
    const isActive = currentPage === link.href.split('?')[0];
    return `<a href="${link.href}" class="${isActive ? 'active' : ''}">${link.label}</a>`;
  }).join('');

  const html = `
    <header class="header">
      <div class="header-inner">
        <a href="index.html" class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>TechMarket</span>
        </a>
        <nav class="nav-links">
          ${navLinksHtml}
        </nav>
        <a href="cart.html" class="cart-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <span class="cart-badge" style="display: ${getCartItemCount() > 0 ? 'flex' : 'none'}">${getCartItemCount()}</span>
        </a>
      </div>
    </header>
  `;

  document.body.insertAdjacentHTML('afterbegin', html);
}

function renderFooter() {
  const html = `
    <footer class="footer">
      <div class="footer-inner">
        <p>&copy; 2026 TechMarket. All rights reserved.</p>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

export function initApp() {
  renderHeader();
  renderFooter();
  updateCartBadge();

  window.addEventListener('cart-updated', updateCartBadge);
}

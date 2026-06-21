import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { SellerRegistrationPage } from './pages/SellerRegistrationPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'products', Component: ProductsPage },
      { path: 'product/:id', Component: ProductDetailPage },
      { path: 'cart', Component: CartPage },
      { path: 'sell', Component: SellerRegistrationPage },
      { path: 'signin', Component: SignInPage },
      { path: 'signup', Component: SignUpPage },
    ],
  },
]);

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

export default function App() {
  useEffect(() => { const source=new URLSearchParams(window.location.search).get('utm_source'); if(source) sessionStorage.setItem('jat-source',source.slice(0,100)); }, []);
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </AuthProvider>
  );
}

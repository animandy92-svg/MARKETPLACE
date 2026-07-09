import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { SplashPage } from './pages/SplashPage';
import { router } from './routes';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splashShown');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  return (
    <AuthProvider>
      <CartProvider>
        {showSplash ? (
          <SplashPage onComplete={handleSplashComplete} />
        ) : (
          <RouterProvider router={router} />
        )}
      </CartProvider>
    </AuthProvider>
  );
}

import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
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
    <CartProvider>
      {showSplash ? (
        <SplashPage onComplete={handleSplashComplete} />
      ) : (
        <RouterProvider router={router} />
      )}
    </CartProvider>
  );
}

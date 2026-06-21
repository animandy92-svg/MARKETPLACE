import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';
import logoSvg from '../../assets/logo.svg';

export function Header() {
  const { itemCount } = useCart();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/products?category=phone', label: 'Phones' },
    { to: '/products?category=laptop', label: 'Laptops' },
    { to: '/products?category=tablet', label: 'Tablets' },
    { to: '/products?category=smartwatch', label: 'Smartwatches' },
    { to: '/products?category=accessory', label: 'Accessories' },
    { to: '/sell', label: 'Sell' },
  ];

  const isActive = (path: string) => {
    const base = path.split('?')[0];
    return location.pathname === base;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoSvg} alt="Jack of all Trades" className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive(link.to)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {link.label}
              {isActive(link.to) && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'var(--gradient-primary)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/signin">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              Sign In
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="outline" size="sm" className="relative border-primary/20 hover:border-primary/40 hover:bg-primary/5">
              <ShoppingCart className="h-4 w-4" />
              <AnimatePresence mode="wait">
                {itemCount > 0 && (
                  <motion.div
                    key={itemCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Badge
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs border-0 text-white"
                      style={{ background: 'var(--gradient-primary)' }}
                    >
                      {itemCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </Link>
        </div>
      </div>
      {/* Gradient accent line */}
      <div className="h-0.5 w-full" style={{ background: 'var(--gradient-primary)' }} />
    </header>
  );
}

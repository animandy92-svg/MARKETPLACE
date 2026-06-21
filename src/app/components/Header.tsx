import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';
import logoSvg from '../../assets/logo.svg';

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoSvg} alt="Jack of all Trades" className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/products?category=phone" className="text-sm hover:text-primary transition-colors">
            Phones
          </Link>
          <Link to="/products?category=laptop" className="text-sm hover:text-primary transition-colors">
            Laptops
          </Link>
          <Link to="/products?category=tablet" className="text-sm hover:text-primary transition-colors">
            Tablets
          </Link>
          <Link to="/products?category=smartwatch" className="text-sm hover:text-primary transition-colors">
            Smartwatches
          </Link>
          <Link to="/products?category=accessory" className="text-sm hover:text-primary transition-colors">
            Accessories
          </Link>
          <Link to="/sell" className="text-sm hover:text-primary transition-colors">
            Sell
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/signin">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

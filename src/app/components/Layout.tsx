import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Toaster } from './ui/sonner';
import { categories } from '../data/categories';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="relative mt-12">
        <div className="h-px w-full" style={{ background: 'var(--gradient-primary)' }} />
        <div
          className="py-12 px-4"
          style={{
            background: 'linear-gradient(180deg, #1e1b4b 0%, #0f0c29 100%)',
          }}
        >
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Jack of all Trades</h3>
                <p className="text-sm text-indigo-200/60">
                  Your everyday marketplace for fashion, appliances, school supplies, electronics, home essentials, and more.
                </p>
              </div>

              {/* Categories */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Categories</h4>
                <div className="space-y-2">
                  {categories.slice(0, 6).map((category) => <Link key={category.id} to={'/products?category=' + category.id} className="block text-sm text-indigo-200/60 hover:text-white transition-colors">{category.name}</Link>)}
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h4>
                <div className="space-y-2">
                  <Link to="/products" className="block text-sm text-indigo-200/60 hover:text-white transition-colors">
                    All Products
                  </Link>
                  <Link to="/sell" className="block text-sm text-indigo-200/60 hover:text-white transition-colors">
                    Sell on Marketplace
                  </Link>
                  <Link to="/cart" className="block text-sm text-indigo-200/60 hover:text-white transition-colors">
                    Your Cart
                  </Link>
                </div>
              </div>

              {/* Account */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Account</h4>
                <div className="space-y-2">
                  <Link to="/signin" className="block text-sm text-indigo-200/60 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link to="/signup" className="block text-sm text-indigo-200/60 hover:text-white transition-colors">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-500/20 pt-6 text-center">
              <p className="text-sm text-indigo-200/40">
                &copy; 2026 Jack of all Trades. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

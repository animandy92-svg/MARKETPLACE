import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Phone } from 'lucide-react';
import { Header } from './Header';
import { Toaster } from './ui/sonner';
import { useShop, phoneLink, communityUrl } from '../lib/shop';

export function Layout() {
  const shop = useShop();
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname, location.search]);
  return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1"><Outlet /></main>
    <footer className="site-footer"><div className="container mx-auto px-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1"><p className="font-bold text-xl">Jack of all Trades<span className="text-[#e7aa87]">.</span></p><p className="text-sm text-[#bbcfc1] mt-4 max-w-xs leading-relaxed">Dream it. Own it.<br />Your everyday marketplace in {shop.serviceArea || 'Ghana'}.</p><a href={communityUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-5 text-xs">Join our WhatsApp community <ArrowUpRight className="w-4" /></a></div>
      <div className="space-y-3 text-sm"><h2 className="font-semibold text-white mb-4">Explore</h2><Link className="block" to="/products">All finds</Link><Link className="block" to="/products?category=phone">Phones</Link><Link className="block" to="/products?category=laptop">Laptops</Link><Link className="block" to="/products?category=school">School & office</Link></div>
      <div className="space-y-3 text-sm"><h2 className="font-semibold text-white mb-4">A little help</h2><Link className="block" to="/delivery">Delivery areas & charges</Link><Link className="block" to="/returns">Returns & refunds</Link><Link className="block" to="/help">Contact support</Link><Link className="block" to="/dashboard/orders">Track your order</Link><a className="block" href="https://github.com/animandy92-svg/MARKETPLACE/releases/download/v1.1.0/jack-of-all-trades-1.1.0.apk" download>Android app · test APK</a></div>
      <div className="space-y-3 text-sm"><h2 className="font-semibold text-white mb-4">Let’s connect</h2>{shop.supportPhone && <a className="flex items-center gap-2" href={phoneLink(shop.supportPhone)}><Phone className="w-4" />{shop.supportPhone}</a>}{shop.supportEmail && <a className="block break-all" href={'mailto:' + shop.supportEmail}>{shop.supportEmail}</a>}<Link className="block" to="/sell">Become a supplier</Link><Link className="block" to="/seller">Seller workspace</Link><Link className="block" to="/admin">Marketplace admin</Link></div>
    </div><div className="mt-10 pt-5 border-t border-white/15 flex flex-wrap justify-between gap-3 text-xs text-[#9fb7a9]"><p>© 2026 Jack of all Trades.</p><p>A little of everything. A lot of possibility.</p></div></div></footer><Toaster />
  </div>;
}

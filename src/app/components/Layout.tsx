import { Outlet } from 'react-router';
import { Header } from './Header';
import { Toaster } from './ui/sonner';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 TechMarket. All rights reserved.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

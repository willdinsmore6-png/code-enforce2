import { Outlet } from 'react-router-dom';
import SuperAdminBanner from './SuperAdminBanner';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CompassBackground from './CompassBackground';

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header aria-label="Application header" className="sticky top-0 z-40 md:static">
        <CompassBackground />
        <div className="hidden md:block"><SuperAdminBanner /></div>
        <MobileNav />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="Main navigation" className="hidden md:flex">
          <Sidebar />
        </nav>
        <main className="flex-1 overflow-y-auto" id="main-content">
          <Outlet />
        </main>
      </div>
      <footer aria-label="Application footer" className="text-center text-xs text-muted-foreground py-2 px-4 border-t border-border">
        <p>&copy; 2026 Code Enforcement. All rights reserved.</p>
      </footer>
    </div>
  );
}
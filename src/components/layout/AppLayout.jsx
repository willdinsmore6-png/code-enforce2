import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext'; // Added useAuth
import { AlertTriangle } from 'lucide-react'; // Added icon
import SubscriptionGate from './SubscriptionGate';
import SuperAdminBanner from './SuperAdminBanner';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CompassBackground from './CompassBackground';

export default function AppLayout() {
  const { appPublicSettings, user } = useAuth();

  // Show banner if maintenance is active or a notice is set
  const isMaintenance = appPublicSettings?.is_maintenance_active === true;
  const maintenanceNotice = appPublicSettings?.maintenance_notice;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      
      {/* GLOBAL MAINTENANCE BANNER */}
      {maintenanceNotice && (
        <div className={`w-full py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 z-[60] shadow-md animate-in slide-in-from-top duration-300 ${
          isMaintenance ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-900'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{maintenanceNotice}</span>
          {user?.role === 'superadmin' && (
            <span className="ml-2 px-1.5 py-0.5 bg-black/20 rounded text-[10px] uppercase">Admin View</span>
          )}
        </div>
      )}

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
          <SubscriptionGate>
            <Outlet />
          </SubscriptionGate>
        </main>
      </div>

      <footer aria-label="Application footer" className="text-center text-xs text-muted-foreground py-2 px-4 border-t border-border">
        <p>&copy; 2026 Code Enforcement. All rights reserved.</p>
      </footer>
    </div>
  );
}

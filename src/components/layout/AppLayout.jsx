import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext'; // Added useAuth
import { AlertTriangle } from 'lucide-react'; // Added icon
import { appLogoUrlFromPublicSettings } from '@/lib/municipalityDisplay';
import { syncPwaInstallBranding } from '@/lib/pwaBranding';
import SubscriptionGate from './SubscriptionGate';
import SuperAdminBanner from './SuperAdminBanner';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CompassBackground from './CompassBackground';

export default function AppLayout() {
  const { appPublicSettings, user, municipality } = useAuth();

  /** Align tab favicon with Base44 app logo (same as hosted login) when TownConfig has no logo. */
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return undefined;
    const initial = link.getAttribute('href');
    const town = (municipality?.logo_url || '').trim();
    const app = appLogoUrlFromPublicSettings(appPublicSettings);
    const href = town || app;
    if (href) link.setAttribute('href', href);
    return () => {
      if (initial) link.setAttribute('href', initial);
    };
  }, [appPublicSettings, municipality?.logo_url]);

  /** PWA “Install app” + apple-touch-icon use the same logo URL as Base44 login (and town logo when set). */
  useEffect(() => {
    syncPwaInstallBranding(municipality, appPublicSettings);
    return () => {
      syncPwaInstallBranding(null, null);
    };
  }, [appPublicSettings, municipality?.logo_url]);

  // Show banner if maintenance is active or a notice is set
  const isMaintenance = appPublicSettings?.is_maintenance_active === true;
  const maintenanceNotice = appPublicSettings?.maintenance_notice;

  return (
    <div className="flex max-h-dvh min-h-0 h-dvh flex-col overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      
      {/* GLOBAL MAINTENANCE BANNER */}
      {maintenanceNotice && (
        <div
          role={isMaintenance ? 'alert' : 'status'}
          aria-live={isMaintenance ? 'assertive' : 'polite'}
          className={`w-full py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 z-[60] shadow-md animate-in slide-in-from-top duration-300 ${
            isMaintenance ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav aria-label="Main navigation" className="hidden md:flex">
          <Sidebar />
        </nav>
        <main
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-gradient-to-b from-primary/[0.04] via-background to-background outline-none dark:from-primary/[0.07] dark:via-background dark:to-background"
          id="main-content"
          tabIndex={-1}
        >
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

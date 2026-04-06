import { useState, useEffect, useRef, useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Plus,
  CalendarClock,
  Scale,
  ScrollText,
  FolderOpen,
  BookOpen,
  Globe,
  Settings,
  Sparkles,
  Search,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import SuperAdminBanner from './SuperAdminBanner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';
import { municipalityNavTitle } from '@/lib/municipalityDisplay';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cases', icon: FileText, label: 'Cases' },
  { path: '/zoning-determinations', icon: ScrollText, label: 'Zoning determinations' },
  { path: '/new-complaint', icon: Plus, label: 'New complaint' },
  { path: '/investigations', icon: Search, label: 'Investigations' },
  { path: '/deadlines', icon: CalendarClock, label: 'Timeline' },
  { path: '/court-actions', icon: Scale, label: 'Court actions' },
  { path: '/documents', icon: FolderOpen, label: 'Document vault' },
  { path: '/property-workspace', icon: MapPin, label: 'Property workspace' },
  { path: '/compass', icon: Sparkles, label: MERIDIAN_DISPLAY_NAME },
  { path: '/resources', icon: BookOpen, label: 'Resource library' },
  { path: '/public-portal', icon: Globe, label: 'Public portal' },
];

const adminItems = [{ path: '/admin', icon: Settings, label: 'Admin tools' }];
const superadminShellNav = [{ path: '/superadmin', icon: ShieldCheck, label: 'Global dashboard' }];

const DRAWER_NAV_ID = 'mobile-navigation-drawer';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { municipality, user, logout, impersonatedMunicipality } = useAuth();
  const drawerTitleId = useId();
  const closeButtonRef = useRef(null);
  const isSuperadminShell = user?.role === 'superadmin' && !impersonatedMunicipality;
  const primaryNav = isSuperadminShell ? superadminShellNav : navItems;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function linkClass(active, shell) {
    return cn(
      'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
      active
        ? shell
          ? 'bg-purple-800/50 text-purple-100'
          : 'bg-sidebar-accent text-sidebar-primary'
        : shell
          ? 'text-purple-200/80 hover:bg-purple-800/30 hover:text-purple-50'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );
  }

  return (
    <>
      <div className="md:hidden">
        <SuperAdminBanner />
      </div>

      <header className="z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            {municipality?.logo_url ? (
              <img
                src={municipality.logo_url}
                alt={
                  municipality?.short_name || municipality?.town_name
                    ? `${municipality.short_name || municipality.town_name} logo`
                    : 'Municipality logo'
                }
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <img src="/icon.svg" alt="" className="h-full w-full object-contain p-0.5" />
            )}
          </div>
          <span className="max-w-[180px] truncate text-sm font-semibold text-sidebar-foreground">
            {municipalityNavTitle(municipality)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-expanded={open}
          aria-controls={DRAWER_NAV_ID}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-50 cursor-default border-0 bg-black/60 p-0 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-[280px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out motion-reduce:transition-none md:hidden',
          open ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
        aria-hidden={!open}
      >
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              {municipality?.logo_url ? (
                <img src={municipality.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
              ) : (
                <img src="/icon.svg" alt="" className="h-full w-full object-contain p-0.5" />
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span id={drawerTitleId} className="truncate text-sm font-semibold">
                {municipalityNavTitle(municipality)}
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/60">
                {municipality?.tagline || 'Code enforcement'}
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav id={DRAWER_NAV_ID} className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Primary">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={linkClass(isActive(item.path), isSuperadminShell)}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          ))}

          {!isSuperadminShell && (user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                Admin
              </p>
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={linkClass(isActive(item.path), false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              {user?.role === 'superadmin' && (
                <Link
                  to="/superadmin"
                  onClick={() => setOpen(false)}
                  aria-current={isActive('/superadmin') ? 'page' : undefined}
                  className={linkClass(isActive('/superadmin'), false)}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Global dashboard
                </Link>
              )}
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => logout()}
          className="flex min-h-[48px] items-center gap-3 border-t border-sidebar-border px-5 py-4 text-left text-sm font-medium text-sidebar-foreground/60 transition-colors hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          Log out
        </button>
      </div>
    </>
  );
}

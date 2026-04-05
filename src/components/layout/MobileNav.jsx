import { useState } from 'react';
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
  Compass,
  Search,
  Menu,
  X,
  Shield,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import SuperAdminBanner from './SuperAdminBanner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cases', icon: FileText, label: 'Cases' },
  { path: '/zoning-determinations', icon: ScrollText, label: 'Zoning determinations' },
  { path: '/new-complaint', icon: Plus, label: 'New Complaint' },
  { path: '/investigations', icon: Search, label: 'Investigations' },
  { path: '/deadlines', icon: CalendarClock, label: 'Timeline' },
  { path: '/court-actions', icon: Scale, label: 'Court Actions' },
  { path: '/documents', icon: FolderOpen, label: 'Document Vault' },
  { path: '/compass', icon: Compass, label: 'Compass AI' },
  { path: '/resources', icon: BookOpen, label: 'Resource Library' },
  { path: '/public-portal', icon: Globe, label: 'Public Portal' },
];

const adminItems = [
  { path: '/admin', icon: Settings, label: 'Admin Tools' },
];

const superadminShellNav = [{ path: '/superadmin', icon: ShieldCheck, label: 'Global Dashboard' }];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { municipality, user, logout, impersonatedMunicipality } = useAuth();
  const isSuperadminShell = user?.role === 'superadmin' && !impersonatedMunicipality;
  const primaryNav = isSuperadminShell ? superadminShellNav : navItems;

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      {/* SuperAdmin Banner (mobile, sticky) */}
      <div className="md:hidden">
        <SuperAdminBanner />
      </div>

      {/* Top Header Bar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
            {municipality?.logo_url
              ? <img src={municipality.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
              : <Shield className="w-4 h-4 text-sidebar-primary" />}
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground truncate max-w-[180px]">
            {municipality?.short_name || municipality?.town_name || 'CodeEnforce'}
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in Drawer */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-[280px] flex-col bg-sidebar text-sidebar-foreground z-50 transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center">
              {municipality?.logo_url
                ? <img src={municipality.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                : <Shield className="w-4 h-4 text-sidebar-primary" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate">{municipality?.short_name || municipality?.town_name || 'CodeEnforce'}</span>
              <span className="text-[10px] text-sidebar-foreground/60">{municipality?.tagline || 'Code Enforcement'}</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                isActive(item.path)
                  ? isSuperadminShell
                    ? 'bg-purple-800/50 text-purple-100'
                    : 'bg-sidebar-accent text-sidebar-primary'
                  : isSuperadminShell
                    ? 'text-purple-200/80 hover:bg-purple-800/30 hover:text-purple-50'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
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
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              ))}
              {user?.role === 'superadmin' && (
                <Link
                  to="/superadmin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                    isActive('/superadmin')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  Super Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-5 py-4 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );
}
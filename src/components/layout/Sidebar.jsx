import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  CalendarClock,
  Scale,
  ScrollText,
  FolderOpen,
  BookOpen,
  Globe,
  ChevronLeft,
  ChevronRight,
  Shield,
  Plus,
  LogOut,
  Settings,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';
import { municipalityNavTitle, navHeaderLogoAlt, navHeaderLogoSrc, navTagline } from '@/lib/municipalityDisplay';

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

const adminNavItems = [{ path: '/admin', icon: Settings, label: 'Admin tools' }];
const superAdminNavItems = [{ path: '/superadmin', icon: Shield, label: 'Global dashboard' }];
const superadminShellNav = [{ path: '/superadmin', icon: Shield, label: 'Global dashboard' }];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { municipality, user, logout, impersonatedMunicipality, appPublicSettings } = useAuth();
  const isSuperadminShell = user?.role === 'superadmin' && !impersonatedMunicipality;
  const primaryNav = isSuperadminShell ? superadminShellNav : navItems;

  function renderNavItem(item, activeClass, inactiveClass, iconActiveClass) {
    const isActive =
      location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        to={item.path}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive ? activeClass : inactiveClass
        )}
      >
        <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', isActive && iconActiveClass)} aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {collapsed && <span className="sr-only">{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        'hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border/30 bg-white">
          <img
            src={navHeaderLogoSrc(municipality, appPublicSettings)}
            alt={navHeaderLogoAlt(municipality, appPublicSettings)}
            className="h-full w-full object-contain p-0.5"
          />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              {municipalityNavTitle(municipality)}
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/60">
              {navTagline(municipality, isSuperadminShell)}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {primaryNav.map((item) =>
          renderNavItem(
            item,
            isSuperadminShell
              ? 'bg-purple-800/40 text-purple-200'
              : 'bg-sidebar-accent text-sidebar-primary',
            isSuperadminShell
              ? 'text-purple-200/80 hover:bg-purple-800/30 hover:text-purple-100'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            isSuperadminShell ? 'text-purple-200' : 'text-sidebar-primary'
          )
        )}

        {!isSuperadminShell && (user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            {!collapsed && (
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                Admin
              </p>
            )}
            {adminNavItems.map((item) =>
              renderNavItem(
                item,
                'bg-sidebar-accent text-sidebar-primary',
                'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                'text-sidebar-primary'
              )
            )}
          </>
        )}

        {!isSuperadminShell && user?.role === 'superadmin' && (
          <>
            {!collapsed && (
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-purple-400">
                Super admin
              </p>
            )}
            {superAdminNavItems.map((item) =>
              renderNavItem(
                item,
                'bg-purple-800/40 text-purple-300',
                'text-purple-400/70 hover:bg-purple-800/30 hover:text-purple-300',
                'text-purple-300'
              )
            )}
          </>
        )}
      </nav>

      <button
        type="button"
        onClick={() => logout()}
        aria-label="Log out"
        className={cn(
          'mx-2 mb-1 flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-red-400'
        )}
      >
        <LogOut className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">Log out</span>}
      </button>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
        className="flex h-12 min-h-[44px] w-full items-center justify-center border-t border-sidebar-border text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
      </button>
    </aside>
  );
}

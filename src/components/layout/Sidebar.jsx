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
  Compass,
} from 'lucide-react';
import { useState } from 'react';
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

const adminNavItems = [
  { path: '/admin', icon: Settings, label: 'Admin Tools' },
];

const superAdminNavItems = [
  { path: '/superadmin', icon: Shield, label: 'Global Dashboard' },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { municipality, user, logout } = useAuth();

  function renderNavItem(item, activeClass, inactiveClass, iconActiveClass) {
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          isActive ? activeClass : inactiveClass
        )}
      >
        <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && iconActiveClass)} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-[68px]" : "w-[260px]"
    )}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-sidebar-border/30">
          {municipality?.logo_url
            ? <img src={municipality.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
            : <Shield className="w-5 h-5 text-sidebar-primary" />}
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{municipality?.short_name || municipality?.town_name || 'CodeEnforce'}</span>
            <span className="text-[11px] text-sidebar-foreground/60 truncate">{municipality?.tagline || (municipality ? `${municipality.state} Code Enforcement` : 'Municipal Compliance System')}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => renderNavItem(
          item,
          "bg-sidebar-accent text-sidebar-primary",
          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
          "text-sidebar-primary"
        ))}

        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-4 pb-1">Admin</p>}
            {adminNavItems.map(item => renderNavItem(
              item,
              "bg-sidebar-accent text-sidebar-primary",
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              "text-sidebar-primary"
            ))}
          </>
        )}

        {user?.role === 'superadmin' && (
          <>
            {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 px-3 pt-4 pb-1">Super Admin</p>}
            {superAdminNavItems.map(item => renderNavItem(
              item,
              "bg-purple-800/40 text-purple-300",
              "text-purple-400/70 hover:text-purple-300 hover:bg-purple-800/30",
              "text-purple-300"
            ))}
          </>
        )}
      </nav>

      <button
        onClick={() => logout()}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm font-medium transition-all duration-150",
          "text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent/50"
        )}
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="truncate">Logout</span>}
      </button>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Search, Bell, Scale, 
  FolderOpen, Wand2, BookOpen, Globe, ChevronLeft, 
  ChevronRight, Shield, Plus, LogOut, Settings, Compass
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cases', icon: FileText, label: 'Cases' },
  { path: '/new-complaint', icon: Plus, label: 'New Complaint' },
  { path: '/investigations', icon: Search, label: 'Investigations' },
  { path: '/deadlines', icon: Bell, label: 'Deadlines' },
  { path: '/court-actions', icon: Scale, label: 'Court Actions' },
  { path: '/documents', icon: FolderOpen, label: 'Document Vault' },
  { path: '/wizard', icon: Wand2, label: 'Action Wizard' },
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

  // --- THE COMMAND CENTER GATEKEEPER ---
  // If Superadmin is at the top level and no town is selected, hide the sidebar entirely.
  const activeTownId = localStorage.getItem('activeTownId');
  const isGlobalSuperAdmin = user?.role === 'superadmin' && !activeTownId;

  if (isGlobalSuperAdmin) {
    return null;
  }

  function renderNavItem(item) {
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    
    // Style sets for standard and Super Admin sections
    const isSuperSection = superAdminNavItems.some(s => s.path === item.path);
    const activeClass = isSuperSection ? "bg-purple-800/40 text-purple-300" : "bg-sidebar-accent text-sidebar-primary";
    const inactiveClass = isSuperSection 
      ? "text-purple-400/70 hover:text-purple-300 hover:bg-purple-800/30" 
      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50";
    const iconClass = isSuperSection ? "text-purple-300" : "text-sidebar-primary";

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          isActive ? activeClass : inactiveClass
        )}
      >
        <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && iconClass)} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border shadow-xl",
      collapsed ? "w-[68px]" : "w-[260px]"
    )}>
      {/* HEADER / LOGO */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-sidebar-border/30">
          {municipality?.logo_url
            ? <img src={municipality.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
            : <Shield className="w-5 h-5 text-sidebar-primary" />}
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-sm font-bold truncate tracking-tight">{municipality?.town_name || 'CodeEnforce'}</span>
            <span className="text-[10px] uppercase font-bold text-sidebar-foreground/40 truncate tracking-widest">
              {municipality?.state ? `${municipality.state} Jurisdiction` : 'Registrar Mode'}
            </span>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems.map(item => renderNavItem(item))}

        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <>
            {!collapsed && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/30 px-3 pt-6 pb-2">Management</p>}
            {adminNavItems.map(item => renderNavItem(item))}
          </>
        )}

        {/* BACK TO GLOBAL (Superadmin only) */}
        {user?.role === 'superadmin' && (
          <>
            {!collapsed && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 px-3 pt-6 pb-2">System Admin</p>}
            {superAdminNavItems.map(item => renderNavItem(item))}
          </>
        )}
      </nav>

      {/* FOOTER ACTIONS */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => logout()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left",
            "text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-400/10"
          )}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span>Logout Session</span>}
        </button>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-10 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

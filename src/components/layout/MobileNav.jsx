import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, Bell, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cases', icon: FileText, label: 'Cases' },
  { path: '/new-complaint', icon: Plus, label: 'New' },
  { path: '/deadlines', icon: Bell, label: 'Deadlines' },
  { path: '/wizard', icon: Wand2, label: 'Wizard' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { workspaceIdForPath, workspaceList } from '@/lib/appModules';

const BAR_ID = 'workspace-areas-nav';

export default function ModuleWorkspaceBar({ hidden }) {
  const { pathname } = useLocation();
  if (hidden) return null;

  const activeId = workspaceIdForPath(pathname);
  const items = workspaceList();

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm">
      <nav id={BAR_ID} className="mx-auto flex max-w-5xl gap-1 px-4 py-2 sm:px-6" aria-label="Workspace areas">
        {items.map((ws) => {
          const isActive = ws.id === activeId;
          return (
            <Link
              key={ws.id}
              to={ws.homePath}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'min-h-[44px] flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors sm:flex-none sm:px-4',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="hidden sm:inline">{ws.label}</span>
              <span className="sm:hidden">{ws.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

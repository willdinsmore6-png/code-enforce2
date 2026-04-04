import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, label, value, trend, trendUp, className }) {
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:ring-white/[0.05]",
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium pb-0.5",
            trendUp ? "text-emerald-600" : "text-red-500"
          )}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
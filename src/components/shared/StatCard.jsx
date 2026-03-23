import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, label, value, trend, trendUp, className }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-[18px] h-[18px] text-primary" />
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
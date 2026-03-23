import { cn } from '@/lib/utils';

const statusConfig = {
  intake: { label: 'Intake', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  investigation: { label: 'Investigation', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  notice_sent: { label: 'Notice Sent', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  awaiting_response: { label: 'Awaiting Response', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  in_compliance: { label: 'In Compliance', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  citation_issued: { label: 'Citation Issued', className: 'bg-red-50 text-red-700 border-red-200' },
  court_action: { label: 'Court Action', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  resolved: { label: 'Resolved', className: 'bg-green-50 text-green-700 border-green-200' },
  closed: { label: 'Closed', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const priorityConfig = {
  low: { label: 'Low', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  high: { label: 'High', className: 'bg-orange-50 text-orange-600 border-orange-200' },
  urgent: { label: 'Urgent', className: 'bg-red-50 text-red-600 border-red-200' },
  critical: { label: 'Critical', className: 'bg-red-50 text-red-600 border-red-200' },
};

export default function StatusBadge({ status, type = 'status' }) {
  const config = type === 'priority' ? priorityConfig : statusConfig;
  const item = config[status] || { label: status, className: 'bg-gray-50 text-gray-600 border-gray-200' };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      item.className
    )}>
      {item.label}
    </span>
  );
}
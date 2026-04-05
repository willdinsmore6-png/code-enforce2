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
  /* Zoning determination workflow */
  draft: { label: 'Draft', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  in_progress: { label: 'In progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  legal_review: { label: 'Legal review', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  issued: { label: 'Issued', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  superseded: { label: 'Superseded', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  withdrawn: { label: 'Withdrawn', className: 'bg-slate-50 text-slate-500 border-slate-200' },
  /* Building permit */
  submitted: { label: 'Submitted', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  under_review: { label: 'Under review', className: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  denied: { label: 'Denied', className: 'bg-red-50 text-red-800 border-red-200' },
  expired: { label: 'Expired', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-50 text-slate-500 border-slate-200' },
  /* Land use application */
  completeness: { label: 'Completeness review', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  abutter_notice: { label: 'Abutter notice', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  hearing_scheduled: { label: 'Hearing scheduled', className: 'bg-violet-50 text-violet-800 border-violet-200' },
  continued: { label: 'Continued', className: 'bg-orange-50 text-orange-800 border-orange-200' },
  deliberation: { label: 'Deliberation', className: 'bg-purple-50 text-purple-800 border-purple-200' },
  nod_draft: { label: 'NOD draft', className: 'bg-teal-50 text-teal-900 border-teal-200' },
  nod_issued: { label: 'NOD issued', className: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
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
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        item.className
      )}
      role="status"
      aria-label={`${type === 'priority' ? 'Priority' : 'Status'}: ${item.label}`}
    >
      {item.label}
    </span>
  );
}
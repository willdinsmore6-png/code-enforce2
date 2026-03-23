import { format } from 'date-fns';
import { FileText, Camera, Scale, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CaseTimeline({ caseData, investigations, notices, courtActions }) {
  const events = [];

  // Case created
  if (caseData.created_date) {
    events.push({
      date: caseData.created_date,
      type: 'case',
      icon: FileText,
      title: 'Complaint Filed',
      description: `Case ${caseData.case_number} created for ${caseData.property_address}`,
      color: 'bg-blue-100 text-blue-700',
    });
  }

  // Investigations
  investigations.forEach(inv => {
    events.push({
      date: inv.investigation_date || inv.created_date,
      type: 'investigation',
      icon: Camera,
      title: 'Site Investigation',
      description: `Officer ${inv.officer_name}: ${inv.field_notes?.slice(0, 100) || 'Field investigation conducted'}${inv.violation_confirmed ? ' — Violation confirmed' : ''}`,
      color: 'bg-purple-100 text-purple-700',
    });
  });

  // Notices
  notices.forEach(n => {
    const labels = {
      first_nov: 'First Notice of Violation',
      second_nov: 'Second Notice of Violation',
      cease_desist_676_17a: 'Cease and Desist (RSA 676:17-a)',
      citation_676_17b: 'Citation (RSA 676:17-b)',
      court_summons: 'Court Summons',
    };
    events.push({
      date: n.date_issued || n.created_date,
      type: 'notice',
      icon: AlertTriangle,
      title: labels[n.notice_type] || 'Notice Issued',
      description: `Sent via ${n.delivery_method?.replace('_', ' ') || 'mail'}${n.rsa_cited ? ` — Citing ${n.rsa_cited}` : ''}`,
      color: 'bg-amber-100 text-amber-700',
    });
  });

  // Court actions
  courtActions.forEach(ca => {
    events.push({
      date: ca.filing_date || ca.created_date,
      type: 'court',
      icon: Scale,
      title: ca.action_type.replace(/_/g, ' '),
      description: `${ca.court_type.replace('_', ' ')}${ca.docket_number ? ` • Docket: ${ca.docket_number}` : ''}`,
      color: 'bg-rose-100 text-rose-700',
    });
  });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-6">Case Timeline</h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {events.map((event, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10", event.color)}>
                  <event.icon className="w-3.5 h-3.5" />
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium capitalize">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {format(new Date(event.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
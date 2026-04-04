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
      color: 'bg-blue-100 text-blue-700',
      details: [
        caseData.complainant_anonymous ? 'Anonymous complaint' : caseData.complainant_name ? `Complainant: ${caseData.complainant_name}` : null,
        caseData.violation_type ? `Violation type: ${caseData.violation_type.replace(/_/g, ' ')}` : null,
        caseData.violation_description ? caseData.violation_description.slice(0, 200) : null,
        caseData.specific_code_violated ? `Code cited: ${caseData.specific_code_violated}` : null,
        caseData.assigned_officer ? `Assigned to: ${caseData.assigned_officer}` : null,
      ].filter(Boolean),
    });
  }

  // Investigations
  investigations.forEach(inv => {
    events.push({
      date: inv.investigation_date || inv.created_date,
      type: 'investigation',
      icon: Camera,
      title: 'Site Investigation',
      color: 'bg-purple-100 text-purple-700',
      details: [
        `Officer: ${inv.officer_name}`,
        inv.violation_confirmed !== undefined ? (inv.violation_confirmed ? '✓ Violation confirmed' : '✗ No violation found') : null,
        inv.field_notes ? `Notes: ${inv.field_notes.slice(0, 200)}` : null,
        inv.site_conditions ? `Site conditions: ${inv.site_conditions}` : null,
        inv.weather_conditions ? `Weather: ${inv.weather_conditions}` : null,
        inv.witnesses ? `Witnesses: ${inv.witnesses}` : null,
        inv.warrant_required ? `Warrant required — Ref: ${inv.warrant_reference || 'RSA 595-B'}` : null,
        inv.evidence_summary ? `Evidence: ${inv.evidence_summary.slice(0, 150)}` : null,
        inv.photos?.length > 0 ? `${inv.photos.length} photo(s) on file` : null,
      ].filter(Boolean),
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
      color: 'bg-amber-100 text-amber-700',
      details: [
        `Delivery: ${n.delivery_method?.replace(/_/g, ' ') || 'Unknown'}`,
        n.rsa_cited ? `RSA cited: ${n.rsa_cited}` : null,
        n.ordinance_cited ? `Ordinance: ${n.ordinance_cited}` : null,
        n.recipient_name ? `Recipient: ${n.recipient_name}` : null,
        n.abatement_deadline ? `Abatement deadline: ${format(new Date(n.abatement_deadline), 'MMM d, yyyy')}` : null,
        n.appeal_deadline ? `Appeal deadline: ${format(new Date(n.appeal_deadline), 'MMM d, yyyy')}` : null,
        n.delivery_confirmed ? `✓ Delivery confirmed ${n.delivery_confirmed_date ? 'on ' + format(new Date(n.delivery_confirmed_date), 'MMM d, yyyy') : ''}` : '⚠ Delivery not yet confirmed',
        n.tracking_number ? `Tracking: ${n.tracking_number}` : null,
      ].filter(Boolean),
    });
  });

  // Court actions
  courtActions.forEach(ca => {
    events.push({
      date: ca.filing_date || ca.created_date,
      type: 'court',
      icon: Scale,
      title: ca.action_type.replace(/_/g, ' '),
      color: 'bg-rose-100 text-rose-700',
      details: [
        `Court: ${ca.court_type.replace(/_/g, ' ')}`,
        ca.docket_number ? `Docket: ${ca.docket_number}` : null,
        ca.attorney_assigned ? `Attorney: ${ca.attorney_assigned}` : null,
        ca.hearing_date ? `Hearing: ${format(new Date(ca.hearing_date), 'MMM d, yyyy h:mm a')}` : null,
        ca.court_location ? `Location: ${ca.court_location}` : null,
        ca.outcome ? `Outcome: ${ca.outcome}` : null,
        ca.penalties_awarded ? `Penalties awarded: $${ca.penalties_awarded.toLocaleString()}` : null,
        ca.injunction_granted ? '✓ Injunction granted' : null,
        ca.next_action_required ? `Next action: ${ca.next_action_required}` : null,
        ca.attorney_notes ? `Notes: ${ca.attorney_notes.slice(0, 150)}` : null,
      ].filter(Boolean),
    });
  });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
      <h3 className="font-semibold mb-5">Case Timeline</h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      ) : (
        <div className="space-y-0">
          {events.map((event, i) => (
            <div key={i} className="flex gap-3 relative">
              {/* Vertical connector line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0", event.color)}>
                  <event.icon className="w-3.5 h-3.5" />
                </div>
                {i < events.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>
              {/* Content */}
              <div className="pb-5 flex-1 min-w-0 pt-1">
                <p className="text-sm font-semibold capitalize leading-snug">{event.title}</p>
                <p className="text-[11px] text-muted-foreground/70 mb-1.5">
                  {format(new Date(event.date), 'MMM d, yyyy')}
                </p>
                {event.details?.length > 0 && (
                  <ul className="space-y-0.5">
                    {event.details.map((d, j) => (
                      <li key={j} className="text-xs text-muted-foreground leading-relaxed break-words">• {d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
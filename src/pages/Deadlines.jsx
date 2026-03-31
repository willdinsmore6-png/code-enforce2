import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Wand2, ArrowRight, CheckCircle, AlertTriangle, FileText, Scale, Clock, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { differenceInDays, format } from 'date-fns';

function buildRecommendations(config) {
  const abatementDays = config?.compliance_days_zoning ?? 30;
  const zbaDays = config?.zba_appeal_days ?? 30;
  const penaltyFirst = config?.penalty_first_offense ?? 275;
  const penaltySubsequent = config?.penalty_subsequent ?? 550;

  return {
    intake: {
      title: 'Complaint Received — Begin Investigation',
      steps: [
        'Assign a Code Enforcement Officer (CEO) to the case',
        'Conduct a site visit to confirm the violation',
        'Determine if violation is visible from public right-of-way or if an administrative warrant (RSA 595-B) is needed',
        'Document findings with photographs and field notes',
      ],
      nextAction: 'Move to Investigation status and log the site visit',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    investigation: {
      title: 'Investigation Complete — Issue Notice of Violation',
      steps: [
        'Generate a formal Notice of Violation (NOV) citing the specific RSA or local ordinance',
        `Include a ${abatementDays}-day abatement deadline per town ordinance`,
        `Inform the violator of their right to appeal to the ZBA within ${zbaDays} days (RSA 676:5)`,
        'Send via Certified Mail AND First Class Mail to ensure legal service',
      ],
      nextAction: 'Create a Notice of Violation from the case detail page',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    notice_sent: {
      title: 'Notice Sent — Monitor for Response',
      steps: [
        'Track certified mail delivery confirmation',
        `Wait for the ${abatementDays}-day abatement period to pass`,
        'Monitor for property owner response or appeal filing',
        'Document any partial compliance or communication',
      ],
      nextAction: 'Update status to "Awaiting Response" once delivery is confirmed',
      icon: Clock,
      color: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    awaiting_response: {
      title: 'Response Period Active — Evaluate Compliance',
      steps: [
        `If ${abatementDays} days passed with NO response → Issue a Second Notice or proceed to enforcement`,
        'If partial compliance → Document progress and consider extension',
        `If property owner requests hearing → Note ZBA appeal deadline (${zbaDays} days from NOV)`,
        'Choose enforcement path: Path A (Citation) or Path B (Superior Court)',
      ],
      nextAction: 'Select a compliance path on the case detail page',
      icon: Scale,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    citation_issued: {
      title: 'Citation Issued (Path A: RSA 676:17-b)',
      steps: [
        'File formal summons and citation with District Court',
        `Track daily civil penalties: $${penaltyFirst}/day first offense, $${penaltySubsequent}/day subsequent`,
        'Ensure proper service of process',
        'Prepare for court appearance — gather all evidence and documentation',
      ],
      nextAction: 'File a Court Action to track the District Court proceedings',
      icon: Scale,
      color: 'bg-red-50 text-red-700 border-red-200',
    },
    court_action: {
      title: 'Court Action in Progress',
      steps: [
        'Attend all scheduled hearings',
        'Track attorney communication and court filings',
        'For injunctive relief (RSA 676:15), document all costs for potential recovery',
        'Monitor for compliance or further court orders',
      ],
      nextAction: 'Update court action status as proceedings advance',
      icon: Scale,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    in_compliance: {
      title: 'Property in Compliance — Verify and Close',
      steps: [
        'Conduct final site inspection to verify full compliance',
        'Document abatement with photographs',
        'Close or resolve the case',
        'Upload proof of abatement to the Document Vault',
      ],
      nextAction: 'Update case status to Resolved',
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700 border-green-200',
    },
  };
}

export default function ActionWizard() {
  const { municipality } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Case.list('-created_date', 100);
      setCases(data.filter(c => !['resolved', 'closed'].includes(c.status)));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const recommendations = buildRecommendations(municipality);
  const rec = selectedCase ? recommendations[selectedCase.status] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Action Wizard"
        description={municipality ? `Guidance for ${municipality.town_name}, ${municipality.state} — ${municipality.compliance_days_zoning}-day abatement · ${municipality.zba_appeal_days}-day ZBA window` : 'Get step-by-step guidance based on NH statutes for your enforcement cases'}
        actions={
          <Link to="/compass">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Ask Compass AI
            </Button>
          </Link>
        }
      />

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">What is the status of the violation?</h2>
            <p className="text-sm text-muted-foreground">Select a case to get recommended next steps</p>
          </div>
        </div>

        <Select value={selectedCase?.id || ''} onValueChange={id => setSelectedCase(cases.find(c => c.id === id))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a case..." />
          </SelectTrigger>
          <SelectContent>
            {cases.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.case_number || c.id.slice(0, 8)} — {c.property_address} ({c.status.replace(/_/g, ' ')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCase && rec && (
        <div className="space-y-6">
          <div className={`rounded-xl border p-6 ${rec.color}`}>
            <div className="flex items-center gap-3 mb-4">
              <rec.icon className="w-6 h-6" />
              <h3 className="text-lg font-bold">{rec.title}</h3>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Current Status:</span>
              <StatusBadge status={selectedCase.status} />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="font-semibold mb-4">Recommended Steps</h4>
            <div className="space-y-3">
              {rec.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Next Action</p>
              <p className="text-sm text-muted-foreground">{rec.nextAction}</p>
            </div>
            <Link to={`/cases/${selectedCase.id}`}>
              <Button size="sm" className="gap-1.5">Go to Case <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>

          {/* Special info based on status */}
          {selectedCase.status === 'awaiting_response' && selectedCase.abatement_deadline && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">⏱ Abatement Deadline Info</p>
              <p className="text-sm text-amber-700">
                Deadline: {format(new Date(selectedCase.abatement_deadline), 'MMMM d, yyyy')} •{' '}
                {differenceInDays(new Date(selectedCase.abatement_deadline), new Date())} days remaining
              </p>
              {differenceInDays(new Date(selectedCase.abatement_deadline), new Date()) < 0 && (
                <p className="text-sm font-semibold text-red-700 mt-2">
                  ⚠ The abatement deadline has passed. Consider issuing a Second Notice or moving to enforcement.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedCase && cases.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground text-sm">No open cases. File a complaint to get started.</p>
          <Link to="/new-complaint">
            <Button className="mt-4">File a Complaint</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

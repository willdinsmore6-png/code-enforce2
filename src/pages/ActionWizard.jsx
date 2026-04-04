import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { 
  Wand2, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Scale, 
  Clock, 
  Compass, 
  ChevronRight,
  Info,
  ShieldCheck,
  Gavel
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';

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
      actionPath: '/cases', 
      icon: FileText,
      color: 'border-blue-200 bg-blue-50/50 text-blue-900',
      accent: 'bg-blue-600'
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
      actionPath: '/cases',
      icon: AlertTriangle,
      color: 'border-amber-200 bg-amber-50/50 text-amber-900',
      accent: 'bg-amber-600'
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
      actionPath: '/cases',
      icon: Clock,
      color: 'border-orange-200 bg-orange-50/50 text-orange-900',
      accent: 'bg-orange-600'
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
      actionPath: '/cases',
      icon: Scale,
      color: 'border-purple-200 bg-purple-50/50 text-purple-900',
      accent: 'bg-purple-600'
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
      actionPath: '/court-actions',
      icon: Gavel,
      color: 'border-red-200 bg-red-50/50 text-red-900',
      accent: 'bg-red-600'
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
      actionPath: '/court-actions',
      icon: ShieldCheck,
      color: 'border-rose-200 bg-rose-50/50 text-rose-900',
      accent: 'bg-rose-600'
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
      actionPath: '/cases',
      icon: CheckCircle,
      color: 'border-green-200 bg-green-50/50 text-green-900',
      accent: 'bg-green-600'
    },
  };
}

export default function ActionWizard() {
  const { municipality } = useAuth();
  const navigate = useNavigate();
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
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const recommendations = buildRecommendations(municipality);
  const rec = selectedCase ? recommendations[selectedCase.status] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Action Wizard"
        description="Statutory enforcement guidance and procedural next steps"
        actions={
          <Link to="/compass">
            <Button variant="outline" size="sm" className="gap-2 shadow-sm">
              <Compass className="w-4 h-4 text-primary" /> Ask Compass AI
            </Button>
          </Link>
        }
      />

      {/* Municipality Parameters Bar */}
      {municipality && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                    <Info className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/40 leading-none mb-1">Jurisdiction Rules</p>
                    <p className="text-sm font-bold">{municipality.town_name}, {municipality.state}</p>
                </div>
            </div>
            <div className="flex gap-6">
                <div>
                    <p className="text-[10px] uppercase font-bold text-white/40 leading-none mb-1">Abatement</p>
                    <p className="text-xs font-mono">{municipality.compliance_days_zoning} Days</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-white/40 leading-none mb-1">ZBA Window</p>
                    <p className="text-xs font-mono">{municipality.zba_appeal_days} Days</p>
                </div>
            </div>
        </div>
      )}

      {/* Case Selector */}
      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
            <Wand2 className="w-24 h-24 text-primary" />
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Select Active Case</h2>
            <p className="text-sm text-muted-foreground">Select a file to generate a customized legal roadmap</p>
          </div>
        </div>

        <Select value={selectedCase?.id || ''} onValueChange={id => setSelectedCase(cases.find(c => c.id === id))}>
          <SelectTrigger className="h-12 text-md shadow-sm border-slate-200">
            <SelectValue placeholder="Search case number or address..." />
          </SelectTrigger>
          <SelectContent>
            {cases.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.case_number || c.id.slice(0, 8)} — {c.property_address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recommended Content */}
      {selectedCase && rec ? (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className={`rounded-2xl border-2 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${rec.color}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-white`}>
                <rec.icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight">{rec.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedCase.status} />
                    <span className="text-[10px] uppercase font-bold opacity-50 tracking-tighter">Current Lifecycle Stage</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-card rounded-2xl border border-border p-8 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Procedural Checklist
                </h4>
                <div className="space-y-6 relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
                    
                    {rec.steps.map((step, i) => (
                        <div key={i} className="flex gap-4 relative z-10 group">
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors">
                                <span className="text-xs font-bold text-slate-500 group-hover:text-primary">{i + 1}</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-slate-700 pt-1.5">{step}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 space-y-6">
                <div className="bg-primary rounded-2xl p-8 text-white shadow-lg shadow-primary/20 relative overflow-hidden">
                    <ArrowRight className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Primary Next Action</h4>
                    <p className="text-lg font-bold leading-tight mb-6">{rec.nextAction}</p>
                    <Button 
                        variant="secondary" 
                        className="w-full font-bold shadow-sm group"
                        onClick={() => navigate(rec.actionPath === '/cases' ? `/cases/${selectedCase.id}` : rec.actionPath)}
                    >
                        Execute Now <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Legal Context</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        This guidance is based on <strong>NH RSA 676</strong> and standard municipal due process. Ensure all notices are documented in the Document Vault.
                    </p>
                </div>
            </div>
          </div>
        </div>
      ) : selectedCase ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <Info className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Status Not Mapped</h3>
          <p className="text-sm text-muted-foreground italic">We don't have specific guidance for the "{selectedCase.status}" status yet.</p>
        </div>
      ) : null}
    </div>
  );
}

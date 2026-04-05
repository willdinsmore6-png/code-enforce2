import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  Wand2,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileText,
  Scale,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  ShieldCheck,
  Gavel,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';
import { buildEnforcementTimeline, abatementDaysForCase } from '@/lib/enforcementTimeline';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';

function buildRecommendations(config) {
  const abatementDays = config?.compliance_days_zoning ?? 30;
  const zbaDays = config?.zba_appeal_days ?? 30;
  const penaltyFirst = config?.penalty_first_offense ?? 275;
  const penaltySubsequent = config?.penalty_subsequent ?? 550;

  const intakeBlock = {
    title: 'Complaint received — begin investigation',
    steps: [
      'Assign a code enforcement officer (CEO) to the case',
      'Conduct a site visit to confirm the violation (building, zoning, planning, health, etc.)',
      'Determine if the violation is visible from the public right-of-way or if an administrative warrant (RSA 595-B) is needed',
      'Document findings with photographs and field notes; schedule another visit if conditions change',
    ],
    nextAction: 'Move to Investigation status and log the site visit',
    actionPath: '/cases',
    icon: FileText,
    color: 'border-blue-200 bg-blue-50/50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100',
    accent: 'bg-blue-600',
  };

  return {
    pending_review: intakeBlock,
    intake: intakeBlock,
    investigation: {
      title: 'Investigation — issue notice of violation when appropriate',
      steps: [
        'Generate a formal notice of violation (NOV) citing RSA and/or local zoning / building / health ordinance',
        `Include a ${abatementDays}-day abatement period (town default — case may use building vs zoning days from town config)`,
        `Inform the violator of appeal rights to the ZBA within ${zbaDays} days where applicable (RSA 676:5 — confirm with counsel)`,
        'Send via certified mail and first class (or method required by ordinance); log service in the case file',
        'If violation spans multiple chapters (e.g. setback + junk), cite each or issue coordinated notices',
      ],
      nextAction: 'Create a notice from the case detail page',
      actionPath: '/cases',
      icon: AlertTriangle,
      color: 'border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
      accent: 'bg-amber-600',
    },
    notice_sent: {
      title: 'Notice sent — monitor for response',
      steps: [
        'Track certified mail / delivery confirmation',
        `Wait for the abatement period; timeline uses your town’s configured day counts`,
        'Monitor for owner response, partial compliance, or ZBA filing',
        'Document communications and any new site conditions (may warrant re-inspection)',
      ],
      nextAction: 'Update status to “Awaiting response” once delivery is confirmed',
      actionPath: '/cases',
      icon: Clock,
      color: 'border-orange-200 bg-orange-50/50 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-100',
      accent: 'bg-orange-600',
    },
    awaiting_response: {
      title: 'Response period — evaluate compliance',
      steps: [
        `After the abatement period with no adequate response → second notice or enforcement per town policy`,
        'Partial compliance → document and consider extension with written terms',
        `ZBA appeal → track appeal window from notice (town ZBA days in config)`,
        'Choose path: citation (676:17-b), superior court, injunctive relief, or continued compliance monitoring',
      ],
      nextAction: 'Select a compliance path on the case detail page',
      actionPath: '/cases',
      icon: Scale,
      color: 'border-purple-200 bg-purple-50/50 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-100',
      accent: 'bg-purple-600',
    },
    citation_issued: {
      title: 'Citation issued (Path A: RSA 676:17-b)',
      steps: [
        'File summons and citation with district court',
        `Track daily civil penalties: $${penaltyFirst}/day first offense, $${penaltySubsequent}/day subsequent`,
        'Ensure proper service of process',
        'Prepare evidence packet and witness list for court',
      ],
      nextAction: 'Record the court action and hearing dates',
      actionPath: '/court-actions',
      icon: Gavel,
      color: 'border-red-200 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100',
      accent: 'bg-red-600',
    },
    court_action: {
      title: 'Court action in progress',
      steps: [
        'Attend hearings; track filings and orders',
        'For injunctive relief (RSA 676:15), document costs for potential recovery',
        'Update the case when compliance is achieved or the court orders next steps',
      ],
      nextAction: 'Update court action records as proceedings advance',
      actionPath: '/court-actions',
      icon: ShieldCheck,
      color: 'border-rose-200 bg-rose-50/50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100',
      accent: 'bg-rose-600',
    },
    in_compliance: {
      title: 'Property in compliance — verify and close',
      steps: [
        'Final inspection with photos',
        'Upload proof of abatement to the document vault',
        'Resolve or close the case in the system',
      ],
      nextAction: 'Update case status to Resolved',
      actionPath: '/cases',
      icon: CheckCircle,
      color: 'border-green-200 bg-green-50/50 text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100',
      accent: 'bg-green-600',
    },
  };
}

function urgencyStyles(u) {
  switch (u) {
    case 'overdue':
      return 'border-destructive/40 bg-destructive/5';
    case 'soon':
      return 'border-amber-500/40 bg-amber-500/5';
    case 'done':
      return 'border-emerald-500/30 bg-emerald-500/5';
    default:
      return 'border-border/80 bg-card/80';
  }
}

export default function Deadlines() {
  const { municipality } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseParam = searchParams.get('case');

  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDeadlines, setCaseDeadlines] = useState([]);
  const [caseNotices, setCaseNotices] = useState([]);
  const [caseInvestigations, setCaseInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = municipality
        ? await base44.entities.Case.filter({ town_id: municipality.id }, '-created_date', 100)
        : await base44.entities.Case.list('-created_date', 100);
      const open = (data || []).filter((c) => !['resolved', 'closed'].includes(c.status));
      setCases(open);
      setLoading(false);
    }
    load();
  }, [municipality]);

  useEffect(() => {
    if (!caseParam || !cases.length) return;
    const c = cases.find((x) => x.id === caseParam);
    if (c) setSelectedCase(c);
  }, [caseParam, cases]);

  useEffect(() => {
    if (!selectedCase?.id) {
      setCaseDeadlines([]);
      setCaseNotices([]);
      setCaseInvestigations([]);
      return;
    }
    let cancelled = false;
    async function loadChildren() {
      const id = selectedCase.id;
      const [dl, nt, inv] = await Promise.all([
        base44.entities.Deadline.filter({ case_id: id }),
        base44.entities.Notice.filter({ case_id: id }),
        base44.entities.Investigation.filter({ case_id: id }),
      ]);
      if (cancelled) return;
      setCaseDeadlines(dl || []);
      setCaseNotices(nt || []);
      setCaseInvestigations(inv || []);
    }
    loadChildren();
    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const recommendations = buildRecommendations(municipality);
  const rec = selectedCase ? recommendations[selectedCase.status] : null;

  const timeline = selectedCase
    ? buildEnforcementTimeline(
        selectedCase,
        municipality,
        caseDeadlines,
        caseNotices,
        caseInvestigations
      )
    : [];

  const abDaysThisCase = selectedCase ? abatementDaysForCase(selectedCase, municipality) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:p-6 lg:p-8">
      <PageHeader
        title="Enforcement timeline & next steps"
        description={
          municipality
            ? `Automated dates use ${municipality.town_name}’s config (e.g. ${abDaysThisCase ?? municipality.compliance_days_zoning}-day abatement for this violation category, ${municipality.zba_appeal_days}-day ZBA window from notice). Add deadlines on the case to track court dates and custom milestones.`
            : 'Select a case to see suggested dates from your town configuration and statutory guidance.'
        }
        helpTitle="Timeline & next steps"
        helpContent={
          <>
            <p>
              Pick a case to see a <strong>suggested workflow</strong> based on status and your town’s configured day counts. These are
              guides, not legal advice — adjust for your ordinances and counsel.
            </p>
            <p>
              Case-specific deadlines are managed on the case record. Use <strong>{MERIDIAN_DISPLAY_NAME}</strong> for statute and process questions.
            </p>
          </>
        }
        actions={
          <Link to="/compass">
            <Button variant="outline" size="sm" className="gap-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Open {MERIDIAN_DISPLAY_NAME}
            </Button>
          </Link>
        }
      />

      {municipality && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-4 text-white shadow-lg dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Info className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-white/40">
                Town timelines
              </p>
              <p className="text-sm font-bold">
                {municipality.town_name}, {municipality.state}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase leading-none text-white/40">Zoning abatement</p>
              <p className="font-mono text-xs">{municipality.compliance_days_zoning ?? 30} days</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase leading-none text-white/40">Building abatement</p>
              <p className="font-mono text-xs">{municipality.compliance_days_building ?? 30} days</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase leading-none text-white/40">ZBA appeal</p>
              <p className="font-mono text-xs">{municipality.zba_appeal_days ?? 30} days</p>
            </div>
          </div>
        </div>
      )}

      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05] sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-5 transition-transform group-hover:scale-110">
          <Wand2 className="h-24 w-24 text-primary" />
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Select a case</h2>
            <p className="text-sm text-muted-foreground">
              View an automated timeline and procedural checklist for that file
            </p>
          </div>
        </div>

        <Select
          value={selectedCase?.id || ''}
          onValueChange={(id) => setSelectedCase(cases.find((c) => c.id === id))}
        >
          <SelectTrigger className="h-12 border-border text-base shadow-sm">
            <SelectValue placeholder="Choose case number or address…" />
          </SelectTrigger>
          <SelectContent>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.case_number || c.id.slice(0, 8)} — {c.property_address} ({c.status?.replace(/_/g, ' ')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCase && rec ? (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className={`rounded-2xl border-2 p-6 ${rec.color}`}>
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-card">
                  <rec.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-tight">{rec.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedCase.status} />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                      Current stage
                    </span>
                  </div>
                </div>
              </div>
              <Link to={`/cases/${selectedCase.id}`}>
                <Button variant="secondary" size="sm" className="gap-2">
                  Open case <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05] sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Automated timeline
              </h4>
              <p className="text-xs text-muted-foreground">
                <span className="mr-2 rounded border border-dashed border-border px-1.5 py-0.5">Auto</span>
                from town rules &amp; case data ·
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5">Recorded</span> from case deadlines
              </p>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add complaint dates, notices, or deadlines on the case to populate this timeline.
              </p>
            ) : (
              <ul className="space-y-3">
                {timeline.map((row) => (
                  <li
                    key={row.id}
                    className={`flex flex-col gap-1 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${urgencyStyles(row.urgency)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{row.label}</span>
                        <span
                          className={
                            row.variant === 'recorded'
                              ? 'rounded bg-muted px-1.5 py-0 text-[10px] font-semibold uppercase'
                              : 'rounded border border-dashed border-border px-1.5 py-0 text-[10px] font-semibold uppercase text-muted-foreground'
                          }
                        >
                          {row.variant === 'recorded' ? 'Recorded' : 'Auto'}
                        </span>
                        {row.urgency === 'overdue' && !row.completed && (
                          <span className="text-[10px] font-bold uppercase text-destructive">Overdue</span>
                        )}
                        {row.urgency === 'soon' && !row.completed && (
                          <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                            ≤ 7 days
                          </span>
                        )}
                        {row.completed && (
                          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                            Done
                          </span>
                        )}
                      </div>
                      {row.detail && <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>}
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {format(row.date, 'MMM d, yyyy')}
                      </p>
                      {!row.completed && row.daysFromToday != null && (
                        <p className="text-xs text-muted-foreground">
                          {row.daysFromToday === 0
                            ? 'Today'
                            : row.daysFromToday > 0
                              ? `in ${row.daysFromToday}d`
                              : `${Math.abs(row.daysFromToday)}d ago`}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-8 md:grid-cols-5">
            <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05] md:col-span-3 md:p-8">
              <h4 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                Procedural checklist
              </h4>
              <div className="relative space-y-6">
                <div className="absolute bottom-2 left-[15px] top-2 w-0.5 bg-border" />
                {rec.steps.map((step, i) => (
                  <div key={i} className="group relative z-10 flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card transition-colors group-hover:border-primary">
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-primary">
                        {i + 1}
                      </span>
                    </div>
                    <p className="pt-1.5 text-sm font-medium leading-relaxed text-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 md:col-span-2">
              <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-lg shadow-primary/20">
                <ArrowRight className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10" />
                <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
                  Primary next action
                </h4>
                <p className="mb-6 text-lg font-bold leading-tight">{rec.nextAction}</p>
                <Button
                  variant="secondary"
                  className="group w-full font-bold shadow-sm"
                  onClick={() =>
                    navigate(rec.actionPath === '/cases' ? `/cases/${selectedCase.id}` : rec.actionPath)
                  }
                >
                  Go there
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-6">
                <h5 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Legal context
                </h5>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Guidance reflects <strong className="text-foreground">NH RSA 676</strong> and common municipal
                  practice for <strong className="text-foreground">building, zoning, and land-use</strong>{' '}
                  enforcement. Timelines use your town’s configured day counts; confirm all appeal and notice rules
                  with town counsel.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : selectedCase ? (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center">
          <Info className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-bold">Status not mapped</h3>
          <p className="text-sm italic text-muted-foreground">
            No checklist template for &quot;{selectedCase.status}&quot; yet. Use the case page to update status or add
            deadlines.
          </p>
          <Link to={`/cases/${selectedCase.id}`} className="mt-4 inline-block">
            <Button size="sm">Open case</Button>
          </Link>
        </div>
      ) : null}

      {!selectedCase && cases.length === 0 && (
        <div className="rounded-2xl border border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No open cases for this municipality.</p>
          <Link to="/new-complaint">
            <Button className="mt-4">File a complaint</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

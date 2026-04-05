import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { PublicPageShell } from '@/components/layout/SkipToMainLink';
import { Button } from '@/components/ui/button';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';
import {
  Building2,
  Shield,
  FileText,
  Globe,
  Scale,
  Lock,
  Sparkles,
  CheckCircle,
  Mail,
  ArrowRight,
  Gavel,
  Users,
} from 'lucide-react';

const SUPPORT_EMAIL = 'support@code-enforce.com';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Code%20Enforce%20Pro%20—%20Information%20request`;

function Section({ id, className = '', children }) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
}

/** Public marketing site at `/`. Logged-in users are sent to the app. */
export function LandingRoute() {
  const { user, isLoadingAuth, isLoadingPublicSettings, impersonatedMunicipality, navigateToLogin } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 text-white"
        role="status"
        aria-live="polite"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (user?.role === 'superadmin' && !impersonatedMunicipality) {
    return <Navigate to="/superadmin" replace />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingMarketing onSignIn={() => navigateToLogin()} />;
}

function LandingMarketing({ onSignIn }) {
  return (
    <PublicPageShell mainClassName="outline-none min-h-dvh bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.35),transparent)]"
          aria-hidden="true"
        />

        <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Code Enforce</span>
            </a>
            <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Page sections">
              <a href="#product" className="transition-colors hover:text-white">
                Product
              </a>
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
              <a href="#security" className="transition-colors hover:text-white">
                Security
              </a>
              <a href="#public-tools" className="transition-colors hover:text-white">
                Public tools
              </a>
              <a href="#contact" className="transition-colors hover:text-white">
                Contact
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={onSignIn}
              >
                Sign in
              </Button>
              <Button type="button" size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={onSignIn}>
                Staff login
              </Button>
            </div>
          </div>
        </header>

        <div>
          <Section id="top" className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-200">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Municipal-grade code enforcement platform
              </p>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Run violations, notices, and court-ready packets from one place
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-slate-400 sm:text-xl">
                Code Enforce Pro helps building officials and code enforcement officers manage cases end-to-end: intake
                through investigations, deadlines, court actions, and secure exports — with optional AI decision-support
                and a public portal for property owners.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button type="button" size="lg" className="h-12 min-w-[200px] bg-blue-600 px-8 text-base hover:bg-blue-500" onClick={onSignIn}>
                  Sign in to your town
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="lg" variant="outline" className="h-12 border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
                  <a href={SUPPORT_MAILTO}>Request information</a>
                </Button>
              </div>
              <p className="mt-6 text-sm text-slate-500">
                Already use the app? Use the same sign-in your municipality provided.
              </p>
            </div>
          </Section>

          <Section id="product" className="border-t border-white/10 bg-slate-900/50 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">Built for municipalities</h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
                One system for your enforcement team — structured workflows, audit-friendly history, and data isolated
                per town so neighboring communities never see each other&apos;s cases.
              </p>
              <div className="mt-14 grid gap-8 sm:grid-cols-3">
                {[
                  {
                    icon: Users,
                    title: 'Your team',
                    text: 'Officers, admins, and leadership share a single source of truth for every case and deadline.',
                  },
                  {
                    icon: Gavel,
                    title: 'Court-ready output',
                    text: 'Generate organized exports and packets to support hearings, filings, and compliance documentation.',
                  },
                  {
                    icon: Building2,
                    title: 'Your brand of record',
                    text: 'Town-specific settings and public-facing tools that stay under your municipality’s authority.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-blue-500/30"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="features" className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">What you can do</h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
                Core capabilities departments use every week — without stitching together spreadsheets and shared drives.
              </p>
              <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: FileText, label: 'Case lifecycle', desc: 'Track complaints, violations, notices, and resolutions in one file.' },
                  { icon: Scale, label: 'Court & deadlines', desc: 'Timeline tools and court-action tracking aligned with how you enforce locally.' },
                  { icon: Globe, label: 'Public portal', desc: 'Let respondents look up case summaries with a printed access code — no staff login required.' },
                  { icon: Sparkles, label: MERIDIAN_DISPLAY_NAME, desc: 'AI assistant for research and drafting — decision-support only; your staff stays in charge.' },
                  { icon: Lock, label: 'Secure documents', desc: 'Evidence and exports stored with strong isolation between municipalities.' },
                  { icon: CheckCircle, label: 'Land use add-ons', desc: 'Zoning determinations and related workflows where your subscription includes them.' },
                ].map(({ icon: Icon, label, desc }) => (
                  <li
                    key={label}
                    className="flex gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-5"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-white">{label}</p>
                      <p className="mt-1 text-sm text-slate-400">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section id="security" className="border-t border-white/10 bg-emerald-950/20 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                <Shield className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Security & responsibility</h2>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Your municipality remains the authority on enforcement. {MERIDIAN_DISPLAY_NAME} and automation features
                are <strong className="text-white">decision-support tools only</strong> — not legal advice or a substitute
                for professional judgment. Data is segregated by town, and exports are designed for accountable,
                court-aware workflows.
              </p>
            </div>
          </Section>

          <Section id="public-tools" className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/80 to-slate-900 p-8 sm:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">For residents & property owners</h2>
              <p className="mt-3 max-w-2xl text-slate-400">
                These pages work without a staff account. Your town shares the right link or access code when appropriate.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="secondary" className="h-11 bg-white text-slate-900 hover:bg-slate-100" asChild>
                  <Link to="/report">Report a concern</Link>
                </Button>
                <Button type="button" variant="outline" className="h-11 border-white/30 text-white hover:bg-white/10" asChild>
                  <Link to="/public-portal">Look up a case (access code)</Link>
                </Button>
              </div>
            </div>
          </Section>

          <Section id="contact" className="border-t border-white/10 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold">Get in touch</h2>
              <p className="mt-4 text-slate-400">
                Questions about Code Enforce Pro, subscriptions, or onboarding your town? Email us — we&apos;ll route you
                to the right person.
              </p>
              <Button type="button" size="lg" className="mt-8 bg-blue-600 hover:bg-blue-500" asChild>
                <a href={SUPPORT_MAILTO} className="inline-flex items-center gap-2">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  {SUPPORT_EMAIL}
                </a>
              </Button>
            </div>
          </Section>
        </div>

        <footer className="border-t border-white/10 bg-slate-950 px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center text-sm text-slate-500 sm:flex-row sm:text-left">
            <div className="flex items-center gap-2 font-medium text-slate-400">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Code Enforce Pro
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <Link to="/report" className="hover:text-white">
                Report
              </Link>
              <Link to="/public-portal" className="hover:text-white">
                Public portal
              </Link>
              <button type="button" className="hover:text-white" onClick={onSignIn}>
                Sign in
              </button>
              <a href={SUPPORT_MAILTO} className="hover:text-white">
                Contact
              </a>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-slate-600 sm:text-left">
            © {new Date().getFullYear()} Code Enforce. Municipal code enforcement software.
          </p>
        </footer>
      </div>
    </PublicPageShell>
  );
}

export default LandingRoute;

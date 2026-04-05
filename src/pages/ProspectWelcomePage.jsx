import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
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
  Mail,
  ArrowRight,
  Phone,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const SUPPORT_EMAIL = 'support@code-enforce.com';
const CONTACT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Code%20Enforce%20Pro%20—%20Prospect%20inquiry`;
const DEMO_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Schedule%20a%20Code%20Enforce%20walkthrough`;

/**
 * Standalone prospect / ad landing page — not linked from the app shell.
 * Share: https://your-domain/welcome
 */
function subscribeAfterLoginUrl() {
  return `${window.location.origin}/subscribe?new=true`;
}

export default function ProspectWelcomePage() {
  const { navigateToLogin, user } = useAuth();

  const goSubscribeNewTown = () => {
    if (user) {
      window.location.assign(subscribeAfterLoginUrl());
      return;
    }
    base44.auth.redirectToLogin(subscribeAfterLoginUrl());
  };

  return (
    <PublicPageShell mainClassName="outline-none min-h-dvh bg-[#faf8f5] text-slate-900 antialiased">
      <div className="relative">
        {/* Subtle page texture */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />

        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#faf8f5]/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-600/25">
                <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <span className="block text-sm font-bold tracking-tight text-slate-900">Code Enforce</span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Pro</span>
              </div>
            </div>
            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex" aria-label="Page">
              <a href="#why" className="transition-colors hover:text-slate-900">
                Why us
              </a>
              <a href="#features" className="transition-colors hover:text-slate-900">
                Capabilities
              </a>
              <a href="#flow" className="transition-colors hover:text-slate-900">
                Get started
              </a>
              <a href="#contact" className="transition-colors hover:text-slate-900">
                Contact
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <Button variant="ghost" size="sm" className="hidden text-slate-600 sm:inline-flex" asChild>
                  <Link to="/dashboard">Open app</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" className="hidden border-slate-300 bg-white sm:inline-flex" asChild>
                <a href={CONTACT_MAILTO}>Email us</a>
              </Button>
              <Button size="sm" className="bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700" onClick={() => navigateToLogin()}>
                Sign in
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pb-28 lg:pt-20">
          <div
            className="pointer-events-none absolute -right-20 top-0 h-[420px] w-[420px] rounded-full bg-blue-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm">
              <Shield className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              Municipal code enforcement
            </p>
            <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
              One platform for violations, timelines, court-ready work — and a calmer inbox.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 sm:text-xl">
              Code Enforce Pro helps towns run code enforcement as a <strong className="font-semibold text-slate-800">single workflow</strong>:
              from complaint to notice, investigation, deadlines, and exports — with a public portal for property owners and optional
              AI assistance that never replaces your authority.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="h-12 min-h-[48px] bg-blue-600 px-8 text-base font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                onClick={() => navigateToLogin()}
              >
                Sign in to your account
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                type="button"
                className="h-12 min-h-[48px] border-slate-300 bg-white px-8 text-base font-semibold"
                onClick={goSubscribeNewTown}
              >
                Start a new town subscription
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              New municipality? Use <strong className="font-medium text-slate-700">Start a new town subscription</strong> after you sign in, or{' '}
              <a href={CONTACT_MAILTO} className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600">
                email {SUPPORT_EMAIL}
              </a>{' '}
              for a walkthrough.
            </p>
          </div>
        </section>

        {/* Why */}
        <section id="why" className="border-y border-slate-200/80 bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Why municipalities choose us</h2>
              <p className="mt-4 text-lg text-slate-600">
                Built for small teams doing serious work — with isolation between towns, structured case history, and tools that match how
                enforcement actually happens in the field and in court.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: 'Purpose-built',
                  body: 'Not a generic CRM — workflows for complaints, NOVs, investigations, deadlines, and court actions.',
                  icon: FileText,
                },
                {
                  title: 'Residents included',
                  body: 'Public reporting and a code lookup portal so owners can engage without staff accounts.',
                  icon: Globe,
                },
                {
                  title: 'Your judgment, always',
                  body: `${MERIDIAN_DISPLAY_NAME} and automation support your staff; final decisions stay with your officials.`,
                  icon: Sparkles,
                },
              ].map(({ title, body, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-7 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section id="features" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">What you get</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Everything in one place — fewer handoffs, clearer audit trails, and less time hunting for the right PDF.
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl font-semibold text-slate-900">Court-aware timelines</h3>
                  <p className="mt-2 max-w-xl text-slate-600">
                    Track abatement windows, hearings, and follow-ups with a timeline that matches how your department enforces — so nothing
                    slips between spreadsheets and the file cabinet.
                  </p>
                </div>
                <ul className="mt-8 space-y-2.5 text-sm text-slate-700">
                  {['Case status from intake through resolution', 'Document vault with town-scoped access', 'Exports formatted for your workflow'].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-600/20">
                <Lock className="h-6 w-6 opacity-90" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Security & separation</h3>
                <p className="mt-2 text-sm leading-relaxed text-blue-100">
                  Data is isolated by municipality. Your evidence and case files stay yours — we are the custodian of the platform, not the owner of your records.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <Globe className="h-6 w-6 text-blue-600" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-slate-900">Public tools</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Optional online reporting and a respondent portal with access codes — so front desk calls drop and owners can self-serve safely.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="text-xs" asChild>
                    <Link to="/report">Report a concern</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" asChild>
                    <Link to="/public-portal">Case lookup</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Flow */}
        <section id="flow" className="border-t border-slate-200/80 bg-slate-900 px-4 py-20 text-white sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-3xl font-semibold tracking-tight sm:text-4xl">How to get started</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
              Three simple paths — pick what matches where you are today.
            </p>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Talk to us',
                  text: 'Questions about pricing, security, or onboarding? Email support and we will help you scope the right rollout.',
                  action: { label: `Email ${SUPPORT_EMAIL}`, href: CONTACT_MAILTO, external: true },
                },
                {
                  step: '2',
                  title: 'Sign in',
                  text: 'If your town already uses Code Enforce Pro, sign in with the account your administrator invited.',
                  action: { label: 'Go to sign in', onClick: () => navigateToLogin() },
                },
                {
                  step: '3',
                  title: 'Subscribe',
                  text: 'Starting fresh? Begin subscription setup for a new municipality, accept terms, and complete billing when you are ready.',
                  action: { label: 'New town subscription', onClick: goSubscribeNewTown },
                },
              ].map(({ step, title, text, action }) => (
                <li key={step} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{step}</span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
                  <div className="mt-5">
                    {action.onClick != null ? (
                      <button
                        type="button"
                        onClick={action.onClick}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-300 hover:text-white"
                      >
                        {action.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : action.external ? (
                      <a
                        href={action.href}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-300 hover:text-white"
                      >
                        {action.label}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : action.href ? (
                      <Link to={action.href} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-300 hover:text-white">
                        {action.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-10 text-center text-white shadow-2xl sm:p-14">
            <Mail className="mx-auto h-10 w-10 text-blue-300" aria-hidden="true" />
            <h2 className="mt-6 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">We are here to help</h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-300">
              Send a note to <strong className="text-white">{SUPPORT_EMAIL}</strong> for demos, security questionnaires, contract questions, or
              anything blocking your board from saying yes.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 bg-white text-slate-900 hover:bg-slate-100" asChild>
                <a href={CONTACT_MAILTO}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Contact support
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <a href={DEMO_MAILTO}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                  Request a walkthrough
                </a>
              </Button>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
            <div>
              <div className="flex items-center justify-center gap-2 font-semibold text-slate-900 sm:justify-start">
                <Building2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                Code Enforce Pro
              </div>
              <p className="mt-1 text-sm text-slate-500">Municipal code enforcement software</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 sm:justify-end">
              <a href={CONTACT_MAILTO} className="hover:text-slate-900">
                {SUPPORT_EMAIL}
              </a>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                |
              </span>
              <button type="button" className="font-medium text-blue-600 hover:underline" onClick={() => navigateToLogin()}>
                Staff sign in
              </button>
              <button type="button" className="hover:text-slate-900" onClick={goSubscribeNewTown}>
                Subscribe
              </button>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-slate-400 sm:text-left">
            Share this page: add <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">/welcome</code> to your
            Code Enforce site URL for brochures, QR codes, and ad campaigns.
          </p>
          <p className="mx-auto mt-3 max-w-6xl text-center text-xs text-slate-400 sm:text-left">
            © {new Date().getFullYear()} Code Enforce. AI features are decision-support only and do not constitute legal advice.
          </p>
        </footer>
      </div>
    </PublicPageShell>
  );
}

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, FileText, CheckCircle, AlertTriangle, Building2, Scale, Database } from 'lucide-react';

export default function Subscribe() {
  const { user, municipality, refreshMunicipality } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New-town setup state (when arriving via ?new=true)
  const isNewTownFlow = new URLSearchParams(window.location.search).get('new') === 'true';
  const [townName, setTownName] = useState('');
  const [townState, setTownState] = useState('NH');
  const [townCreated, setTownCreated] = useState(false);
  const [createdTownId, setCreatedTownId] = useState(null);

  async function handleSubscribe() {
    if (!agreed) return;
    setLoading(true);
    setError(null);
    try {
      let townId = user?.data?.town_id || user?.town_id;

      // If new-town flow, create the town first
      if (isNewTownFlow && !townCreated) {
        if (!townName.trim()) {
          setError('Please enter your town name.');
          setLoading(false);
          return;
        }
        const res = await base44.functions.invoke('setupNewTown', {
          town_name: townName.trim(),
          state: townState,
          agreement_accepted_at: new Date().toISOString(),
          agreement_accepted_by: user?.email,
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Failed to create town');
        townId = res.data.town_id;
        setCreatedTownId(townId);
        setTownCreated(true);
      }

      const res = await base44.functions.invoke('createStripeCheckout', {
        town_id: townId,
        user_email: user?.email,
        agreement_accepted_at: new Date().toISOString(),
        agreement_accepted_by: user?.email,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message || 'Failed to start checkout');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg">CodeEnforce Pro</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-4 py-1.5 rounded-full mb-6">
            <Shield className="w-3.5 h-3.5" /> Municipal-Grade Code Enforcement Platform
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Activate Your Town's Subscription
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Full access to AI-assisted enforcement tools, court-ready exports, and secure case management for your municipality.
          </p>
        </div>

        {/* New Town Setup Fields */}
        {isNewTownFlow && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Your Municipality</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm text-slate-400">Town / City Name *</label>
                <input
                  type="text"
                  value={townName}
                  onChange={e => setTownName(e.target.value)}
                  placeholder="e.g. Town of Bow"
                  className="w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-slate-400">State</label>
                <select
                  value={townState}
                  onChange={e => setTownState(e.target.value)}
                  className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['NH','ME','VT','MA','CT','RI','NY','NJ','PA','OH','MI','WI','MN','IL','IN'].map(s => (
                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-emerald-950/40 border border-emerald-700/30 rounded-2xl p-8 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-emerald-600/20 rounded-lg flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-emerald-300">Data Safety & Security</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Encrypted Evidence Storage', desc: 'All case photos, documents, and evidence are stored in AES-256 encrypted buckets. Files are never shared across municipalities.' },
              { title: 'Town Data Ownership', desc: 'Your town owns all case data — photos, notes, and documents. We are solely the custodian providing the platform.' },
              { title: 'Isolated by Municipality', desc: 'Row-level security ensures no town can ever see another town\'s case data. Full data isolation is enforced at the database level.' },
              { title: 'Secure Court Exports', desc: 'PDF exports are generated server-side and stored in private encrypted buckets with time-limited signed download URLs.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms of Service */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Scale className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Terms of Service & User Agreement</h2>
          </div>

          <div className="space-y-5 text-sm text-slate-300 leading-relaxed max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> 1. AI Decision-Support Tool — Not Legal Authority
              </h3>
              <p>The AI-powered violation detection, Compass advisor, and automated recommendations provided by this platform are <strong>decision-support tools only</strong>. They do not constitute legal advice or final enforcement authority. The licensed building official, code enforcement officer, or duly authorized municipal representative is the <strong>sole final authority</strong> on all code interpretations, violation determinations, and enforcement actions. Your municipality accepts full responsibility for all enforcement decisions made using this platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" /> 2. Data Ownership & Custodianship
              </h3>
              <p>Your municipality retains <strong>full ownership</strong> of all case data, photographs, documents, field notes, and enforcement records entered into the platform. CodeEnforce Pro serves as a data custodian — we store and process your data solely to provide the platform services. We do not sell, share, or use your municipal data for any purpose beyond operating the platform. Upon subscription cancellation, you may request a full data export within 30 days.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" /> 3. Court-Ready Document Integrity
              </h3>
              <p>PDF court file exports generated by this platform represent a snapshot of case data at the time of generation. <strong>Any modifications made to exported documents after generation are solely the responsibility of the town and its authorized personnel.</strong> CodeEnforce Pro cannot guarantee the integrity of documents altered outside the platform. For evidentiary purposes, we recommend using unmodified platform exports.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">4. Subscription Terms</h3>
              <p>Subscriptions are billed monthly at $50/month per municipality. You may cancel at any time; access continues through the end of the current billing period. CodeEnforce Pro reserves the right to update pricing with 30 days written notice. Continued use after notice constitutes acceptance of new pricing.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">5. Acceptable Use</h3>
              <p>This platform is licensed exclusively for use by authorized municipal employees and their designated legal counsel. Unauthorized access, sharing of credentials, or use for non-municipal commercial purposes is strictly prohibited and may result in immediate account termination without refund.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">6. Click-Wrap Agreement</h3>
              <p>By checking the box below and proceeding to payment, your municipality enters into a binding click-wrap agreement with these terms. This electronic acceptance is legally equivalent to a written signature under applicable electronic signature laws (E-SIGN Act, UETA).</p>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-0.5 border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                I am an authorized representative of my municipality. I have read and agree to the <strong className="text-white">Terms of Service & User Agreement</strong> above. I understand that AI tools are decision-support aids and that my municipality's licensed officials bear final enforcement authority. I acknowledge that exported court documents must not be altered after generation for evidentiary use.
              </span>
            </label>
          </div>
        </div>

        {/* CTA */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}
        <div className="text-center">
          <Button
            onClick={handleSubscribe}
            disabled={!agreed || loading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-6 text-base font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting to Stripe…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Agree & Subscribe — $50/month
              </span>
            )}
          </Button>
          <p className="text-xs text-slate-500 mt-3">Secured by Stripe · Cancel anytime · No setup fees</p>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isTownInactive } from '@/lib/authRoutePolicy';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPageShell } from '@/components/layout/SkipToMainLink';

const POLL_MS = 2500;
const SLOW_HINT_AFTER_MS = 45000;

export default function Success() {
  const { refreshMunicipality, user, municipality, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = useRef(false);
  const [showSlowHint, setShowSlowHint] = useState(false);

  const handleCheckAgain = useCallback(async () => {
    await refreshMunicipality();
  }, [refreshMunicipality]);

  /** Poll until webhook marks the town active; do not send users to / while still inactive (App would redirect to /subscribe). */
  useEffect(() => {
    if (!user) return;
    refreshMunicipality();
    const id = setInterval(() => {
      refreshMunicipality();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [user, refreshMunicipality]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => setShowSlowHint(true), SLOW_HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [user]);

  useEffect(() => {
    if (!user || !municipality) return;
    if (isTownInactive(municipality)) return;
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate('/dashboard', { replace: true });
  }, [user, municipality, navigate]);

  const waiting =
    user && municipality && isTownInactive(municipality);

  return (
    <PublicPageShell mainClassName="outline-none min-h-dvh bg-slate-900 text-white">
      <div className="flex min-h-[60vh] items-center justify-center p-6" role="status" aria-live="polite">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Payment successful</h1>

          {!user ? (
            <div className="space-y-6 text-left text-slate-300 text-sm leading-relaxed">
              <p>
                Your subscription payment went through. <strong className="text-white">Sign in with the same account you used at checkout</strong> so we
                can link your town and open the dashboard.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-slate-400">
                <li>Use the Sign in button below (same email as Stripe checkout).</li>
                <li>After sign-in, if you are not taken to the dashboard automatically, open this site again — your town should activate within a minute.</li>
                <li>If anything looks wrong, reply to your Stripe receipt email or contact your CodeEnforce administrator.</li>
              </ol>
              <Button onClick={() => navigateToLogin()} className="w-full bg-blue-600 hover:bg-blue-500">
                Sign in to continue
              </Button>
            </div>
          ) : (
            <>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Thank you. We are turning on full access for your municipality. This usually takes under a minute after Stripe confirms payment.
              </p>
              <p className="text-slate-500 mb-8 text-xs leading-relaxed">
                <strong className="text-slate-400">What happens next:</strong> your account will move to the main dashboard automatically once activation
                completes. You do not need to subscribe again.
              </p>

              {waiting && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center gap-3 text-blue-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Activating your town…</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCheckAgain}
                    className="border-white/20 text-slate-200 hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                    Check again now
                  </Button>
                </div>
              )}

              {showSlowHint && waiting && (
                <div
                  className="mt-8 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-left text-sm text-amber-100/90"
                  role="region"
                  aria-label="Activation taking longer than expected"
                >
                  <p className="font-medium text-amber-200 mb-2">Still waiting?</p>
                  <p className="text-amber-100/80 leading-relaxed">
                    Sometimes activation takes a few minutes. Use <strong>Check again now</strong>, or refresh this page. If it persists, confirm your
                    Stripe webhook is configured in the Stripe Dashboard (so we receive <code className="text-xs bg-black/30 px-1 rounded">checkout.session.completed</code>
                    ). You can also activate the town manually from the super-admin panel if needed.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PublicPageShell>
  );
}

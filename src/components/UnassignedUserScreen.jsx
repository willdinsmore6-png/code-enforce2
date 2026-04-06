import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, LogOut, UserCheck, Mail, ArrowRight, Copy, Check, Loader2 } from 'lucide-react';
import { PublicPageShell } from '@/components/layout/SkipToMainLink';

export default function UnassignedUserScreen() {
  const { checkAppState } = useAuth();
  const [copied, setCopied] = useState(false);
  const [claimingInvite, setClaimingInvite] = useState(true);
  const supportEmail = "support@code-enforce.com";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('claimStaffInvite', {});
        if (!cancelled && res.data?.claimed) {
          try {
            await checkAppState();
          } catch (e) {
            console.warn('checkAppState after claim failed', e);
          }
        }
      } catch (e) {
        console.warn('claimStaffInvite', e);
      } finally {
        if (!cancelled) setClaimingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  
  const handleContactSupport = () => {
    window.location.href = `mailto:${supportEmail}?subject=Onboarding%20Request&body=Hello,%20I%20need%20help%20setting%20up%20my%20town%20on%20CodeEnforce.`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  if (claimingInvite) {
    return (
      <PublicPageShell mainClassName="outline-none min-h-dvh bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="flex min-h-[70vh] items-center justify-center p-6" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-4 text-slate-300">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" aria-hidden />
            <p className="text-sm">Checking your invitation...</p>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell mainClassName="outline-none min-h-dvh bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <Building2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Account Not Linked</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your account isn't associated with a municipality yet.
          </p>
        </div>

        <div className="space-y-4">
          {/* Option 1: Existing Town */}
          <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5 text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-100">Joining an existing town?</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Please reach out to your <strong>Town Supervisor</strong>. They can add you as a user and link your account via the Admin panel.
                </p>
              </div>
            </div>
          </div>

          <div className="relative py-2 flex items-center gap-4">
            <div className="flex-grow border-t border-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">OR</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* Option 2: New Town / Support */}
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-400 px-4">
              If you haven't set up your town for onboarding yet, contact our team to get started:
            </p>
            
            <div className="flex gap-2">
              <Button
                className="flex-1 h-14 gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 group"
                onClick={handleContactSupport}
              >
                <Mail className="w-5 h-5" />
                Email Support
                <ArrowRight className="w-4 h-4 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                className="h-14 w-14 border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl flex items-center justify-center shrink-0"
                onClick={copyToClipboard}
                title="Copy email address"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full gap-2 text-slate-500 hover:text-white hover:bg-white/5 mt-4 transition-colors"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
    </PublicPageShell>
  );
}

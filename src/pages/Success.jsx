import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle, Loader2, ShieldCheck, Zap, Building2 } from 'lucide-react';

export default function Success() {
  const { refreshMunicipality, user, municipality } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function activateDashboard() {
      // PRESERVED: Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // PRESERVED: Force app to pull latest 'is_active: true'
      await refreshMunicipality();
      
      // 3. Send them to the dashboard
      navigate('/');
    }

    if (user) {
      activateDashboard();
    }
  }, [user, refreshMunicipality, navigate]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 font-sans overflow-hidden relative">
      
      {/* Success Glow Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[40px] p-12 shadow-2xl text-center relative z-10 animate-in zoom-in-95 fade-in duration-700">
        
        {/* Animated Success Icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
            <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/40">
                <CheckCircle className="w-12 h-12 text-white" />
            </div>
        </div>
        
        <h1 className="text-4xl font-black mb-4 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Payment Confirmed
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm font-medium">
            Your transaction was successful. We are now provisioning your **Municipal Command Center** and linking your local RSAs.
        </p>

        {/* Activation Progress Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">License Secured</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Provisioning</span>
                </div>
            </div>
            
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full animate-progress-fast origin-left" />
            </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-slate-500 font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em]">Finalizing Dashboard...</span>
        </div>

        {/* Footer Detail */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex items-center justify-center gap-3 text-slate-500 italic text-[11px]">
          <Building2 className="w-3.5 h-3.5" />
          {municipality?.town_name || 'Town'} Enforcement Instance Online
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-fast {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress-fast {
          animation: progress-fast 2.5s ease-in-out forwards;
        }
      `}} />
    </div>
  );
}

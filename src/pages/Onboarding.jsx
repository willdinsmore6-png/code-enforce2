import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Building2, Mail, LogOut, Info } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  // Pre-fills an email so they don't have to type much
  const mailtoLink = `mailto:admin@://code-enforce.com Town Onboarding Request&body=User: ${user?.email}%0D%0A%0D%0AI need to be linked to the following municipality:%0D%0A- Town Name:%0D%0A- State:`;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
        
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/20">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold mb-3 tracking-tight">Account Pending Setup</h1>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          Welcome to CodeEnforce Pro. Your account is active, but it hasn't been linked to a municipality yet. Please notify your supervisor or request a town setup below.
        </p>

        <div className="space-y-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-500 py-6 text-md font-semibold transition-all active:scale-95"
            onClick={() => window.location.href = mailtoLink}
          >
            <Mail className="w-4 h-4 mr-2" /> Notify Admin for Setup
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full text-slate-400 hover:text-white hover:bg-white/5"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-start gap-3 text-left">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-normal">
            Once an admin links your account to a town, you will automatically see your town's subscription and dashboard options.
          </p>
        </div>
      </div>
    </div>
  );
}

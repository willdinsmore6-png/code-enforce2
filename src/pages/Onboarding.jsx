import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { 
  Building2, 
  Mail, 
  LogOut, 
  Info, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function Onboarding() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // PRESERVED: Original logout logic
  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  // NEW: Utility to help users give admins their ID if mailto fails
  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PRESERVED: Your original mailtoLink logic
  const mailtoLink = `mailto:admin@://code-enforce.com Onboarding Request&body=User: ${user?.email}%0D%0A%0D%0AI need to be linked to the following municipality:%0D%0A- Town Name:%0D%0A- State:%0D%0A- User ID: ${user?.id}`;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Background Decorative Blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Animated Icon Header */}
        <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-600 rounded-2xl animate-ping opacity-20" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/40">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
        </div>
        
        <h1 className="text-3xl font-black mb-3 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Account Pending
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm font-medium">
            Welcome to **CodeEnforce Pro**. Your account is active, but it hasn't been linked to a municipality yet.
        </p>

        {/* Visual Process Tracker */}
        <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Verified</span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-800 mx-2 mb-6" />
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 animate-pulse">
                    <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Linking</span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-800 mx-2 mb-6" />
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center border border-slate-700">
                    <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Access</span>
            </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-500 py-7 text-md font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 group"
            onClick={() => window.location.href = mailtoLink}
          >
            <Mail className="w-5 h-5 mr-3 group-hover:animate-bounce" /> Notify Administrator
          </Button>

          <div className="flex gap-2">
            <Button 
                variant="outline"
                className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 py-6 rounded-2xl transition-all"
                onClick={copyUserId}
            >
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied" : "Copy ID"}
            </Button>
            
            <Button 
                variant="ghost" 
                className="flex-1 text-slate-500 hover:text-red-400 hover:bg-red-400/5 py-6 rounded-2xl"
                onClick={handleLogout}
            >
                <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-10 pt-8 border-t border-slate-800/50 flex items-start gap-4 text-left">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mb-1">System Notice</p>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Once your supervisor links your profile, you will automatically gain access to your town's enforcement dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

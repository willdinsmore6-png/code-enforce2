import React from 'react';
import { 
  CheckCircle, 
  Mail, 
  ShieldCheck, 
  LogOut, 
  Clock, 
  Fingerprint,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PendingApprovalScreen() {
  // PRESERVED: Original logout logic
  const handleLogout = () => {
    base44.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Background Decorative Element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[40px] p-10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Animated Security Icon */}
        <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl animate-ping opacity-10" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/40">
                <Fingerprint className="w-10 h-10 text-white" />
            </div>
        </div>
        
        <h1 className="text-3xl font-black mb-3 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Verification In Progress
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm font-medium">
            Your request for **CodeEnforce Pro** access has been successfully submitted to our security team.
        </p>

        {/* Status Tracker */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Step 1</p>
                    <p className="text-xs font-bold text-white">Request Received</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Step 2</p>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                        Admin Review <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    </p>
                </div>
            </div>
        </div>

        {/* Informational Message */}
        <div className="flex gap-4 p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-left mb-8">
            <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
            <div>
                <p className="text-xs font-bold text-blue-100 mb-1 leading-tight">Municipality Assignment</p>
                <p className="text-[11px] text-blue-100/60 leading-relaxed font-medium">
                    A SuperAdmin is currently verifying your credentials. You will be assigned to your town's jurisdiction and notified via email shortly.
                </p>
            </div>
        </div>

        <div className="space-y-4">
            <Button 
                onClick={handleLogout} 
                variant="ghost" 
                className="w-full h-14 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 font-bold gap-2 group"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sign Out
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Access Protocol</span>
            </div>
        </div>
      </div>
    </div>
  );
}

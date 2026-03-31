import React from 'react';
import { ShieldAlert, LogOut, Mail, RefreshCw, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  const handleRefreshLogin = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Background Security Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[40px] p-10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Animated Warning Icon */}
        <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-orange-500 rounded-2xl animate-ping opacity-10" />
            <div className="relative w-full h-full bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-900/40">
                <ShieldAlert className="w-10 h-10 text-white" />
            </div>
        </div>
        
        <h1 className="text-3xl font-black mb-3 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Access Restricted
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm font-medium">
            Your current account credentials are not authorized for the **CodeEnforce Pro** environment.
        </p>

        {/* Diagnostic Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Security Protocol
            </h3>
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5" />
                    <p className="text-[11px] text-slate-400 leading-normal">Ensure you are using your official <strong>.gov</strong> or municipal email address.</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5" />
                    <p className="text-[11px] text-slate-400 leading-normal">New accounts must be manually whitelisted by a Super Administrator.</p>
                </div>
            </div>
        </div>

        <div className="space-y-3">
            <Button 
                onClick={handleRefreshLogin} 
                className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2 group shadow-lg"
            >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> 
                Try Different Account
            </Button>
            
            <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 font-bold gap-2"
                onClick={() => window.location.href = 'mailto:support@code-enforce.com'}
            >
                <Mail className="w-4 h-4" /> Contact Support
            </Button>
        </div>

        {/* System Identifier */}
        <div className="mt-10 pt-8 border-t border-slate-800/50 flex items-center justify-center gap-2 text-slate-600">
            <ShieldAlert className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Error Code: 403_UNAUTHORIZED</span>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;

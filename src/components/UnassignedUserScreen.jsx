import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Building2, LogOut, UserCheck } from 'lucide-react';

export default function UnassignedUserScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">Account Not Linked</h1>
        <p className="text-slate-500 text-sm mb-8">
          Your account isn't associated with a municipality yet. You can set up a new town and subscribe, or wait for your administrator to invite you.
        </p>

        <div className="space-y-3">
          <Button
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/subscribe?new=true')}
          >
            <Building2 className="w-4 h-4" />
            Set Up New Town & Subscribe
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">or</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p>Ask your municipal administrator to invite you via the Admin Tools → Users panel. They'll assign you to the correct town.</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full gap-2 text-slate-500 mt-2"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" /> Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
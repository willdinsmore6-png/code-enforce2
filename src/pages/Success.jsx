import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle, Loader2 } from 'lucide-react';
import { PublicPageShell } from '@/components/layout/SkipToMainLink';

export default function Success() {
  const { refreshMunicipality, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function activateDashboard() {
      // 1. Wait a moment for the webhook to finish its work
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Force the app to pull the latest 'is_active: true' from the DB
      await refreshMunicipality();
      
      // 3. Send them to the dashboard
      navigate('/');
    }

    if (user) {
      activateDashboard();
    }
  }, [user, refreshMunicipality, navigate]);

  return (
    <PublicPageShell mainClassName="outline-none min-h-dvh bg-slate-900 text-white">
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="status" aria-live="polite">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-slate-400 mb-8">
          We are activating your town's dashboard. You will be redirected in just a moment.
        </p>
        <div className="flex items-center justify-center gap-3 text-blue-400 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span>Finalizing setup...</span>
        </div>
      </div>
    </div>
    </PublicPageShell>
  );
}

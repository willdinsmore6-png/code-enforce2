import React from 'react';
import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PendingApprovalScreen() {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-blue-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Request Submitted</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Thank you for signing up! Your access request has been received.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">What happens next?</p>
                <p className="text-sm text-blue-700">
                  A superadmin will review your request and assign you to a municipality. You'll receive a notification once approved.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              For questions, contact your administrator.
            </p>
          </div>

          <Button onClick={handleLogout} variant="outline" className="w-full mt-6">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

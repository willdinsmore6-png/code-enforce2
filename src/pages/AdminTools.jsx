import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '../components/shared/PageHeader';
import { KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminTools() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const response = await base44.functions.invoke('adminResetPassword', { email: email.trim() });
    if (response.data?.success) {
      setResult({ success: true, message: response.data.message });
      setEmail('');
    } else {
      setResult({ success: false, message: response.data?.error || 'Something went wrong.' });
    }
    setLoading(false);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Admin Tools"
        description="Administrative utilities for managing user accounts"
      />

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Send Password Reset</h2>
            <p className="text-sm text-muted-foreground">Send a password reset email to a user</p>
          </div>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label>User Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Email'}
          </Button>
        </form>

        {result && (
          <div className={`mt-4 flex items-start gap-2 p-4 rounded-lg text-sm ${
            result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.success
              ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <p>{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
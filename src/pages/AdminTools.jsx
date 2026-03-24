import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '../components/shared/PageHeader';
import { KeyRound, CheckCircle, AlertTriangle, ClipboardList, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminTools() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterCase, setFilterCase] = useState('');

  useEffect(() => {
    base44.entities.AuditLog.list('-timestamp', 500)
      .then(logs => setAuditLogs(logs || []))
      .finally(() => setLogsLoading(false));
  }, []);

  function exportToCSV() {
    const rows = filteredLogs.map(log => ({
      Timestamp: log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
      User: log.user_name || log.user_email || '',
      Email: log.user_email || '',
      Case: log.case_number || log.case_id || '',
      'Entity Type': log.entity_type || '',
      Action: log.action || '',
      Changes: log.changes || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredLogs = auditLogs.filter(log =>
    !filterCase || (log.case_number || '').toLowerCase().includes(filterCase.toLowerCase()) ||
    (log.case_id || '').toLowerCase().includes(filterCase.toLowerCase())
  );

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
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

      {/* Audit Log */}
      <div className="mt-8 bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold">Case Modification Audit Log</h2>
              <p className="text-sm text-muted-foreground">All edits made to cases, notices, and documents</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter by case #..."
              value={filterCase}
              onChange={e => setFilterCase(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredLogs.length === 0} className="gap-1.5">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No audit log entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Case</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Action</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Changes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy h:mm a') : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-xs">{log.user_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{log.user_email}</p>
                    </td>
                    <td className="py-2 pr-4 text-xs font-mono">{log.case_number || log.case_id?.slice(0, 8) || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{log.entity_type}</span>
                    </td>
                    <td className="py-2 pr-4 text-xs">{log.action}</td>
                    <td className="py-2 text-xs text-muted-foreground max-w-xs">
                      {log.changes ? (
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline">View changes</summary>
                          <pre className="mt-1 text-[10px] bg-muted p-2 rounded overflow-x-auto max-w-xs">
                            {(() => { try { return JSON.stringify(JSON.parse(log.changes), null, 2); } catch { return log.changes; } })()}
                          </pre>
                        </details>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '../components/shared/PageHeader';
import { KeyRound, CheckCircle, AlertTriangle, ClipboardList, Download, Building2, Users, Upload, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function AdminTools() {
  const { user, municipality, reloadMunicipality } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterCase, setFilterCase] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [muniForm, setMuniForm] = useState({
    name: '', short_name: '', municipality_type: 'town', state: 'NH',
    address: '', contact_email: '', contact_phone: '', website: '',
    tagline: '', logo_url: '',
  });
  const [savingMuni, setSavingMuni] = useState(false);
  const [muniSaved, setMuniSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    // Load municipality data into form
    if (municipality) {
      setMuniForm(f => ({
        ...f,
        name: municipality.name || '',
        short_name: municipality.short_name || '',
        municipality_type: municipality.municipality_type || 'town',
        state: municipality.state || 'NH',
        address: municipality.address || '',
        contact_email: municipality.contact_email || '',
        contact_phone: municipality.contact_phone || '',
        website: municipality.website || '',
        tagline: municipality.tagline || '',
        logo_url: municipality.logo_url || '',
      }));
    }
  }, [municipality]);

  useEffect(() => {
    base44.functions.invoke('getUsers', {}).then(r => {
      setUsers(r.data?.users || []);
      setLoadingUsers(false);
    });
    base44.entities.AuditLog.list('-timestamp', 500).then(logs => {
      setAuditLogs(logs || []);
      setLogsLoading(false);
    });
  }, []);

  const filteredLogs = auditLogs.filter(log =>
    !filterCase || (log.case_number || '').toLowerCase().includes(filterCase.toLowerCase()) ||
    (log.case_id || '').toLowerCase().includes(filterCase.toLowerCase())
  );

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    await base44.users.inviteUser(inviteEmail.trim(), 'user');
    setInviteResult({ success: true, message: `Invitation sent to ${inviteEmail}` });
    setInviteEmail('');
    setInviting(false);
    // Reload users
    const r = await base44.functions.invoke('getUsers', {});
    setUsers(r.data?.users || []);
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetLoading(true);
    setResetResult(null);
    const response = await base44.functions.invoke('adminResetPassword', { email: resetEmail.trim() });
    if (response.data?.success) {
      setResetResult({ success: true, message: response.data.message });
      setResetEmail('');
    } else {
      setResetResult({ success: false, message: response.data?.error || 'Something went wrong.' });
    }
    setResetLoading(false);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMuniForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  }

  async function handleSaveMuni(e) {
    e.preventDefault();
    setSavingMuni(true);
    if (municipality?.id) {
      await base44.functions.invoke('updateMunicipality', { municipality_id: municipality.id, ...muniForm });
      await reloadMunicipality();
    }
    setSavingMuni(false);
    setMuniSaved(true);
    setTimeout(() => setMuniSaved(false), 3000);
  }

  function exportToCSV() {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map(log => ({
      Timestamp: log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
      User: log.user_name || log.user_email || '',
      Email: log.user_email || '',
      Case: log.case_number || log.case_id || '',
      'Entity Type': log.entity_type || '',
      Action: log.action || '',
      Changes: log.changes || '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Admin Tools"
        description={municipality ? `Managing ${municipality.name}` : 'Administrative utilities'}
      />

      <Tabs defaultValue="municipality">
        <TabsList className="mb-6">
          <TabsTrigger value="municipality" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Municipality</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Audit Log</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Security</TabsTrigger>
        </TabsList>

        {/* Municipality Settings */}
        <TabsContent value="municipality">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {muniForm.logo_url ? <img src={muniForm.logo_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Building2 className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h2 className="font-semibold">Municipality Profile</h2>
                <p className="text-sm text-muted-foreground">Public-facing information and branding</p>
              </div>
            </div>

            {!municipality ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No municipality assigned</p>
                <p className="text-sm mt-1">Contact your system administrator to be assigned to a municipality.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveMuni} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Official Name</Label>
                    <Input value={muniForm.name} onChange={e => setMuniForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Name</Label>
                    <Input value={muniForm.short_name} onChange={e => setMuniForm(f => ({ ...f, short_name: e.target.value }))} placeholder="e.g. Bow" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={muniForm.municipality_type} onValueChange={v => setMuniForm(f => ({ ...f, municipality_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="town">Town</SelectItem>
                        <SelectItem value="city">City</SelectItem>
                        <SelectItem value="village">Village</SelectItem>
                        <SelectItem value="borough">Borough</SelectItem>
                        <SelectItem value="township">Township</SelectItem>
                        <SelectItem value="county">County</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={muniForm.state} onValueChange={v => setMuniForm(f => ({ ...f, state: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Email</Label>
                    <Input type="email" value={muniForm.contact_email} onChange={e => setMuniForm(f => ({ ...f, contact_email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input value={muniForm.contact_phone} onChange={e => setMuniForm(f => ({ ...f, contact_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input value={muniForm.website} onChange={e => setMuniForm(f => ({ ...f, website: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Mailing Address</Label>
                    <Input value={muniForm.address} onChange={e => setMuniForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Tagline (shown in app header)</Label>
                    <Input value={muniForm.tagline} onChange={e => setMuniForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Code Enforcement Division" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {muniForm.logo_url ? (
                      <img src={muniForm.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingLogo ? 'Uploading...' : muniForm.logo_url ? 'Change Logo' : 'Upload Logo'}
                      </div>
                    </label>
                    {muniForm.logo_url && (
                      <button type="button" onClick={() => setMuniForm(f => ({ ...f, logo_url: '' }))} className="text-xs text-red-500 hover:underline">Remove</button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={savingMuni}>{savingMuni ? 'Saving...' : 'Save Changes'}</Button>
                  {muniSaved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saved!</span>}
                </div>
              </form>
            )}
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold">Invite Staff User</h2>
                <p className="text-sm text-muted-foreground">Invite someone to join your municipality's enforcement team</p>
              </div>
            </div>
            <form onSubmit={handleInvite} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="officer@yourtown.gov" required />
              </div>
              <Button type="submit" disabled={inviting} className="gap-1.5">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
            {inviteResult && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {inviteResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {inviteResult.message}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Team Members ({users.length})</h2>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : (
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{u.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">No team members yet. Invite someone above.</div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold">Case Modification Audit Log</h2>
                  <p className="text-sm text-muted-foreground">All edits to cases, notices, and documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Filter by case #..." value={filterCase} onChange={e => setFilterCase(e.target.value)} className="w-44" />
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredLogs.length === 0} className="gap-1.5">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
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
                        <td className="py-2 pr-4"><span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{log.entity_type}</span></td>
                        <td className="py-2 pr-4 text-xs">{log.action}</td>
                        <td className="py-2 text-xs text-muted-foreground max-w-xs">
                          {log.changes ? (
                            <details className="cursor-pointer">
                              <summary className="text-primary hover:underline">View</summary>
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
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
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
                <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="user@example.com" required />
              </div>
              <Button type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send Reset Email'}</Button>
            </form>
            {resetResult && (
              <div className={`mt-4 flex items-start gap-2 p-4 rounded-lg text-sm ${resetResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {resetResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <p>{resetResult.message}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
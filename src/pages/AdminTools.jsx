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
import { 
  KeyRound, 
  CheckCircle, 
  AlertTriangle, 
  ClipboardList, 
  Download, 
  Building2, 
  Users, 
  Upload, 
  Loader2, 
  UserPlus, 
  Trash2, 
  X, 
  Hash, 
  ShieldCheck, 
  Mail, 
  Globe, 
  MapPin, 
  Phone,
  Search,
  History
} from 'lucide-react';
import { format } from 'date-fns';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function AdminTools() {
  const { user, municipality, refreshMunicipality } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTownId, setInviteTownId] = useState('');
  const [towns, setTowns] = useState([]);
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
    if (municipality) {
      setMuniForm({
        name: municipality.town_name || '',
        short_name: municipality.short_name || '',
        state: municipality.state || 'NH',
        logo_url: municipality.logo_url || '',
        tagline: municipality.tagline || '',
        contact_email: municipality.contact_email || '',
        contact_phone: municipality.contact_phone || '',
        website: municipality.website || '',
        address: municipality.address || '',
      });
    }
  }, [municipality]);

  useEffect(() => {
    async function loadData() {
        const r = await base44.functions.invoke('getUsers', { town_id: municipality?.id });
        setUsers(r.data?.users || []);
        setLoadingUsers(false);

        if (user?.role === 'superadmin') {
            const t = await base44.entities.TownConfig.list('town_name', 100);
            setTowns(t || []);
        } else if (municipality) {
            setInviteTownId(municipality.id);
        }

        if (municipality?.id) {
            const logs = await base44.entities.AuditLog.filter({ town_id: municipality.id }, '-timestamp', 500);
            setAuditLogs(logs || []);
            setLogsLoading(false);
        } else {
            setLogsLoading(false);
        }
    }
    loadData();
  }, [municipality, user?.role]);

  const filteredLogs = auditLogs.filter(log =>
    !filterCase || (log.case_number || '').toLowerCase().includes(filterCase.toLowerCase()) ||
    (log.case_id || '').toLowerCase().includes(filterCase.toLowerCase())
  );

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await base44.functions.invoke('inviteStaffUser', { email: inviteEmail.trim(), role: 'user', town_id: inviteTownId || municipality?.id });
      if (res.data?.error) throw new Error(res.data.error);
      setInviteResult({ success: true, message: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      const r = await base44.functions.invoke('getUsers', { town_id: municipality?.id });
      setUsers(r.data?.users || []);
    } catch (err) {
      setInviteResult({ success: false, message: err?.message || 'Failed to send invite.' });
    }
    setInviting(false);
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

  async function handleRemoveUser(userId, userEmail) {
    if (!window.confirm(`Are you sure you want to remove ${userEmail}?`)) return;
    try {
      const r = await base44.functions.invoke('deleteUser', { userId });
      if (r.data?.error) throw new Error(r.data.error);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(`Unable to remove this user directly.`);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      const r = await base44.functions.invoke('updateUserRole', { userId, role: newRole });
      if (r.data?.error) throw new Error(r.data.error);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Unable to change role.`);
    }
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
    if (!municipality?.id) return;
    setSavingMuni(true);
    await base44.entities.TownConfig.update(municipality.id, {
        town_name: muniForm.name,
        state: muniForm.state,
        logo_url: muniForm.logo_url,
        tagline: muniForm.tagline,
        short_name: muniForm.short_name,
        contact_email: muniForm.contact_email,
        contact_phone: muniForm.contact_phone,
        website: muniForm.website,
        address: muniForm.address,
      });
    setSavingMuni(false);
    setMuniSaved(true);
    if (refreshMunicipality) refreshMunicipality();
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
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `audit-log-${municipality?.short_name || 'town'}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Administrative Tools" 
        description={`Manage staff, branding, and oversight for ${municipality?.town_name || 'your municipality'}`}
      />

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Town Info
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="w-4 h-4" /> Audit
          </TabsTrigger>
        </TabsList>

        {/* TEAM MANAGEMENT */}
        <TabsContent value="team" className="space-y-8 outline-none">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl border border-border shadow-sm">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" /> Active Staff
                    </h3>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-bold text-muted-foreground uppercase tracking-tight">
                        {users.length} Total Accounts
                    </span>
                </div>
                <div className="divide-y divide-border">
                    {loadingUsers ? (
                        <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading team...</div>
                    ) : users.map(u => (
                        <div key={u.id} className="p-5 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {u.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground leading-none mb-1">{u.email}</p>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={u.role || 'user'} />
                                        <span className="text-[10px] text-muted-foreground uppercase font-black">Joined {u.created_at ? format(new Date(u.created_at), 'MMM yyyy') : 'Recently'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Select defaultValue={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                                    <SelectTrigger className="w-[120px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Staff User</SelectItem>
                                        <SelectItem value="admin">Town Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveUser(u.id, u.email)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" /> Invite Member
                    </h3>
                    <form onSubmit={handleInvite} className="space-y-4 relative z-10">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black text-white/40">Email Address</Label>
                            <Input 
                                placeholder="clerk@townname.nh.gov" 
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>
                        <Button className="w-full font-bold h-11 shadow-lg shadow-primary/20" disabled={inviting}>
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                            Send Invitation
                        </Button>
                        {inviteResult && (
                            <p className={`text-xs font-bold text-center mt-2 ${inviteResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {inviteResult.message}
                            </p>
                        )}
                    </form>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <KeyRound className="w-4 h-4" /> Security Overrides
                    </h3>
                    <form onSubmit={handleReset} className="space-y-4">
                        <Input 
                            placeholder="User Email" 
                            className="h-10 text-sm"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <Button variant="outline" className="w-full text-xs font-bold" disabled={resetLoading}>
                            Trigger Password Reset
                        </Button>
                        {resetResult && (
                            <p className={`text-xs font-medium text-center mt-2 ${resetResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {resetResult.message}
                            </p>
                        )}
                    </form>
                </div>
            </div>
          </div>
        </TabsContent>

        {/* TOWN BRANDING */}
        <TabsContent value="branding" className="outline-none">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-8 border-b border-border bg-muted/30">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                {muniForm.logo_url ? (
                                    <img src={muniForm.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                                ) : (
                                    <Building2 className="w-12 h-12 text-slate-300" />
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                                <Upload className="w-6 h-6 text-white" />
                                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                            </label>
                            {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
                        </div>
                        <div className="flex-1 space-y-1">
                            <h2 className="text-2xl font-black">{muniForm.name || "Municipality Name"}</h2>
                            <p className="text-sm text-muted-foreground">{muniForm.tagline || "Enforcement Department"}</p>
                            <div className="flex flex-wrap gap-4 mt-4">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5" /> {muniForm.state}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Globe className="w-3.5 h-3.5" /> {muniForm.website || 'No website'}
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleSaveMuni} disabled={savingMuni} className="shadow-lg shadow-primary/20">
                            {savingMuni ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            {muniSaved ? 'Saved!' : 'Save Profile'}
                        </Button>
                    </div>
                </div>

                <div className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Full Town Name</Label>
                        <Input value={muniForm.name} onChange={e => setMuniForm({...muniForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Short Display Name</Label>
                        <Input value={muniForm.short_name} onChange={e => setMuniForm({...muniForm, short_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">State</Label>
                        <Select value={muniForm.state} onValueChange={v => setMuniForm({...muniForm, state: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                                {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Contact Email</Label>
                        <Input value={muniForm.contact_email} onChange={e => setMuniForm({...muniForm, contact_email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Department Tagline</Label>
                        <Input value={muniForm.tagline} onChange={e => setMuniForm({...muniForm, tagline: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Website URL</Label>
                        <Input value={muniForm.website} onChange={e => setMuniForm({...muniForm, website: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 space-y-2">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Physical Address</Label>
                        <Textarea value={muniForm.address} onChange={e => setMuniForm({...muniForm, address: e.target.value})} className="min-h-[80px]" />
                    </div>
                </div>
            </div>
        </TabsContent>

        {/* AUDIT LOGS */}
        <TabsContent value="logs" className="space-y-6 outline-none">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter by case number..." 
                        className="pl-10 h-10 shadow-sm"
                        value={filterCase}
                        onChange={e => setFilterCase(e.target.value)}
                    />
                </div>
                <Button variant="outline" onClick={exportToCSV} className="gap-2 h-10 w-full md:w-auto shadow-sm">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Timestamp</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">User</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Case / Item</th>
                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logsLoading ? (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Fetching logs...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-muted-foreground">No matching logs found.</td></tr>
                            ) : filteredLogs.map((log, i) => (
                                <tr key={i} className="hover:bg-muted/20 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                                        {log.timestamp ? format(new Date(log.timestamp), 'MMM d, h:mm a') : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold leading-none mb-1">{log.user_name || 'System'}</p>
                                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{log.user_email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded text-[10px] font-black uppercase">{log.entity_type || 'Entity'}</span>
                                            <p className="font-medium text-foreground">{log.case_number || log.case_id || '—'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                                {log.action?.includes('create') && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                {log.action?.includes('update') && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                {log.action?.includes('delete') && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                                {log.action}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{log.changes}</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

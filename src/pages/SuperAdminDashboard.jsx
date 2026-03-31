import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Building2, Users, Plus, Trash2, Shield, FileText, Search, Filter, Download, TrendingUp,
  AlertTriangle, CheckCircle, Loader2, UserPlus, X, Edit, Globe, Copy, Calendar, Activity, Zap, History, Clock, Mail
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100"
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} flex flex-col gap-1 shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const { user, impersonateMunicipality, appPublicSettings, checkAppState } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [towns, setTowns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMaintenance, setIsMaintenance] = useState(appPublicSettings?.is_maintenance_active || false);
  const [maintenanceNote, setMaintenanceNote] = useState(appPublicSettings?.maintenance_notice || "Planned updates in progress.");
  const [copiedId, setCopiedId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Wizard (New Town) State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTown, setNewTown] = useState({ town_name: '', state: 'NH', address: '', contact_email: '', contact_phone: '', tagline: '' });

  // Invite User State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteTownId, setInviteTownId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  // Broadcast Email State
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Confirmation State
  const [confirmingTown, setConfirmingTown] = useState(null);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const [townsData, usersRes, casesData] = await Promise.all([
        base44.entities.TownConfig.list('-created_date', 200),
        base44.functions.invoke('getUsers', { all: true }),
        base44.entities.Case.list('-created_date', 1000),
      ]);
      setTowns(townsData || []);
      setAllUsers(usersRes.data?.users || []);
      setAllCases(casesData || []);
    } catch (err) { console.error("Load failed:", err); }
    setLoading(false);
  }

  // --- ANALYTICS ENGINE ---
  const systemMetrics = useMemo(() => {
    const months = {};
    const heatmap = {};
    const townTrends = {};

    allCases.forEach(c => {
      const date = new Date(c.created_date);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      months[key] = (months[key] || 0) + 1;
      heatmap[c.town_id] = (heatmap[c.town_id] || 0) + 1;

      const daysAgo = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        if (!townTrends[c.town_id]) townTrends[c.town_id] = Array(7).fill(0);
        townTrends[c.town_id][6 - daysAgo]++;
      }
    });

    return {
      caseHistory: Object.entries(months).slice(-6),
      activityHeatmap: heatmap,
      townTrends,
      recentLogs: allCases.slice(0, 10)
    };
  }, [allCases]);

  const filteredTowns = useMemo(() => {
    return towns.filter(t => {
      const matchesSearch = t.town_name.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? t.is_active : !t.is_active;
      return matchesSearch && matchesStatus;
    });
  }, [towns, searchTerm, statusFilter]);

  // --- CORE SYSTEM HANDLERS ---
  const handleToggleMaintenance = async () => {
    if (!window.confirm(`Toggle Global Maintenance Mode?`)) return;
    setIsUpdatingStatus(true);
    try {
      await base44.entities.AppSettings.update('global_config', { is_maintenance_active: !isMaintenance, maintenance_notice: maintenanceNote });
      setIsMaintenance(!isMaintenance);
      await checkAppState();
    } catch (err) { alert("Status update failed."); }
    setIsUpdatingStatus(false);
  };

  const handleCreateTown = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await base44.functions.invoke('setupNewTown', { ...newTown, is_active: true, agreement_accepted_at: new Date().toISOString(), agreement_accepted_by: user?.email });
      if (res.data?.success) { setWizardOpen(false); load(); }
    } catch (err) { alert(err.message); }
    setIsUpdatingStatus(false);
  };

  const handleExportCSV = () => {
    const headers = ['Town', 'ID', 'Status', 'Total Cases'];
    const rows = filteredTowns.map(t => [t.town_name, t.id, t.is_active ? 'Active' : 'Inactive', systemMetrics.activityHeatmap[t.id] || 0]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `code_enforce_audit.csv`; a.click();
  };

  async function handleSendBroadcast(e) {
    e.preventDefault();
    if (!window.confirm(`Send this email to ALL ${broadcastTarget}?`)) return;
    setSendingBroadcast(true);
    try {
      const res = await base44.functions.invoke('sendSystemBroadcast', { subject: broadcastSubject, message: broadcastMessage, target: broadcastTarget, sent_by: user.email });
      if (res.data?.success) { alert("Broadcast dispatched!"); setBroadcastSubject(''); setBroadcastMessage(''); }
    } catch (err) { alert("Broadcast failed."); }
    setSendingBroadcast(false);
  }

  // --- USER & TOWN MANAGEMENT ---
  async function handleToggleActive() {
    if (!confirmingTown) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = !confirmingTown.is_active;
      await base44.entities.TownConfig.update(confirmingTown.id, { is_active: newStatus });
      setTowns(prev => prev.map(t => t.id === confirmingTown.id ? { ...t, is_active: newStatus } : t));
      setConfirmingTown(null);
    } catch (err) { console.error(err); }
    setIsUpdatingStatus(false);
  }

  async function handleRoleChange(userId, newRole) {
    await base44.functions.invoke('updateUserRole', { userId, role: newRole });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  }

  async function handleTownAssign(userId, townId) {
    await base44.functions.invoke('updateUserTown', { userId, town_id: townId || null });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, town_id: townId || null } : u));
  }

  async function handleRemoveUser(userId, email) {
    if (!window.confirm(`Permanently remove ${email}?`)) return;
    await base44.functions.invoke('deleteUser', { userId });
    setAllUsers(prev => prev.filter(u => u.id !== userId));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true); setInviteResult(null);
    try {
      await base44.functions.invoke('superAdminInvite', { email: inviteEmail.trim(), role: inviteRole, town_id: inviteTownId || null });
      setInviteResult({ success: true, message: `Access link sent!` });
      setInviteEmail(''); load();
    } catch (err) { setInviteResult({ success: false, message: 'Invite failed.' }); }
    setInviting(false);
  }

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (user?.role !== 'superadmin') return <div className="p-8 text-center text-slate-500">SuperAdmin Access Required.</div>;
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-slate-50/30 min-h-screen">
      
      {/* 1. MAINTENANCE CONTROLS */}
      <div className="mb-8 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isMaintenance ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Global Status: <span className={isMaintenance ? 'text-red-400' : 'text-emerald-400'}>{isMaintenance ? 'Maintenance' : 'Operational'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} className="h-9 text-xs bg-white/5 border-white/10 text-slate-300 w-full sm:w-80" />
            <Button size="sm" variant={isMaintenance ? "destructive" : "outline"} onClick={handleToggleMaintenance} disabled={isUpdatingStatus}>
              {isMaintenance ? "Disable Lock" : "Enable Maintenance"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS & ANALYTICS */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Towns" value={towns.length} color="purple" />
          <StatCard icon={Users} label="Users" value={allUsers.length} color="blue" />
          <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
          <StatCard icon={Zap} label="Growth" value={`+${towns.filter(t => new Date(t.created_date) > new Date(Date.now() - 30*24*60*60*1000)).length}`} color="orange" />
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col h-full min-h-[140px]">
          <div className="flex items-center justify-between mb-4"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Case Volume Trend</span><TrendingUp className="w-3.5 h-3.5 text-blue-500" /></div>
          <div className="flex items-end justify-between h-full gap-1.5 px-2">
            {systemMetrics.caseHistory.map(([month, count]) => (
              <div key={month} className="flex-1 bg-blue-500/10 border-t border-blue-500/30 rounded-t-sm group relative" style={{ height: `${(count / (Math.max(...systemMetrics.caseHistory.map(s => s)) || 1)) * 100}%` }}>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <Tabs defaultValue="towns">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="towns">Towns</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Activity Log</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Button onClick={() => { setWizardStep(1); setWizardOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"><Plus className="w-4 h-4" /> New Town</Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="bg-white border-slate-200 text-slate-600 gap-2"><Download className="w-3.5 h-3.5" /> Export Audit</Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-white border-slate-200 shadow-sm" />
            </div>
          </div>
        </div>

        {/* TOWN CARDS TAB */}
        <TabsContent value="towns" className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTowns.map(t => {
            const caseCount = systemMetrics.activityHeatmap[t.id] || 0;
            const trend = systemMetrics.townTrends[t.id] || Array(7).fill(0);
            return (
              <div key={t.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all flex flex-col relative isolate ${!t.is_active ? 'border-orange-200 bg-orange-50/20 grayscale-[0.3]' : 'hover:border-blue-400'}`}>
  <div className="flex justify-between items-start mb-4">
    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border shadow-inner">
      {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-slate-400" />}
    </div>
    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border shadow-sm">
      <Checkbox checked={t.is_active} onCheckedChange={() => setConfirmingTown(t)} />
      <Label className="text-[10px] font-bold uppercase cursor-pointer">{t.is_active ? 'Active' : 'Inactive'}</Label>
    </div>
  </div>
  <h3 className="font-bold text-lg leading-tight mb-1">{t.town_name}</h3>
  <p className="text-[10px] font-mono text-slate-400 mb-4">{t.id}</p>

  {/* FIXED MINI ACTIVITY GRAPH */}
  <div className="mb-4 relative isolate">
    <div className="flex justify-between items-end mb-1.5 px-0.5 text-[10px] font-bold text-slate-400 uppercase">
      <span>Activity Heat</span>
      <span className="text-blue-600">{caseCount} Cases</span>
    </div>
    {/* overflow-hidden and isolate prevent the blue bars from escaping this box */}
    <div className="flex items-end gap-0.5 h-8 bg-slate-50 rounded-md p-1 border overflow-hidden">
      {trend.map((v, i) => (
        <div 
          key={i} 
          className="flex-1 bg-blue-500/40 rounded-t-[1px] pointer-events-none" 
          style={{ height: `${Math.max((v / (Math.max(...trend) || 1)) * 100, 5)}%` }} 
        />
      ))}
    </div>
  </div>


                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between bg-slate-100/50 rounded-lg px-3 py-2 border">
                    <span className="text-[10px] font-bold text-slate-500">{t.state} Municipality</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(t.id)}>
                      {copiedId === t.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <Button onClick={() => impersonateMunicipality(t)} className={`w-full font-bold shadow-sm ${t.is_active ? 'bg-slate-800 text-white' : 'bg-orange-600 text-white'}`}>
                    {t.is_active ? 'Enter Town' : 'Troubleshoot Account'}
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* USERS TABLE TAB */}
        <TabsContent value="users">
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                <tr><th className="p-4">User Email</th><th className="p-4">Assigned Town</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium">{u.email}</td>
                    <td className="p-4">
                      <Select value={u.town_id || "Null"} onValueChange={(val) => handleTownAssign(u.id, val === "Null" ? null : val)}>
                        <SelectTrigger className="h-8 w-48 text-xs bg-white"><SelectValue placeholder="No Town" /></SelectTrigger>
                        <SelectContent>{towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}<SelectItem value="Null">Unassigned</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                        <SelectTrigger className="h-8 w-32 text-xs bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="superadmin">SuperAdmin</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveUser(u.id, u.email)}><Trash2 className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit">
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {systemMetrics.recentLogs.map((log, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div><p className="text-sm font-medium">Activity in {log.town_id.slice(0,8)}</p><p className="text-[10px] text-slate-500">Record updated at {new Date(log.updated_date || log.created_date).toLocaleString()}</p></div>
                </div>
                <div className="text-right flex items-center gap-2 text-slate-400"><Clock className="w-3 h-3" /> <span className="text-xs">System Event</span></div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* BROADCAST TAB */}
        <TabsContent value="broadcast">
          <div className="max-w-2xl bg-white border rounded-xl p-8 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Mail className="w-5 h-5 text-amber-500" /> System Broadcast</h2>
            <form onSubmit={handleSendBroadcast} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Recipient Group</Label>
                  <Select value={broadcastTarget} onValueChange={setBroadcastTarget}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Users</SelectItem><SelectItem value="admin">Admins Only</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label>Priority</Label><div className="h-10 flex items-center px-3 bg-slate-50 border rounded-md text-xs font-bold text-amber-600">Urgent Notification</div></div>
              </div>
              <div className="space-y-1.5"><Label>Subject</Label><Input value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} placeholder="System Update Notice" required /></div>
              <div className="space-y-1.5"><Label>Message</Label><textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="w-full min-h-[200px] p-4 bg-slate-50 border rounded-lg text-sm" placeholder="Details..." required /></div>
              <Button type="submit" disabled={sendingBroadcast} className="w-full bg-blue-600 text-white font-bold">{sendingBroadcast ? "Dispatching..." : "Dispatch Broadcast"}</Button>
            </form>
          </div>
        </TabsContent>

        {/* INVITE TAB */}
        <TabsContent value="invite">
          <div className="max-w-md bg-white border rounded-xl p-6 shadow-sm mx-auto sm:mx-0">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" /> User Invitation</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div><Label>Email</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="officer@town.gov" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Role</Label><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
                <div><Label>Town</Label><Select value={inviteTownId} onValueChange={setInviteTownId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <Button type="submit" className="w-full bg-blue-600 text-white" disabled={inviting}>{inviting ? "Inviting..." : "Send Invite"}</Button>
              {inviteResult && <div className={`p-3 mt-4 rounded-lg text-sm ${inviteResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{inviteResult.message}</div>}
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- ALL WIZARDS AND DIALOGS --- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Town Onboarding</DialogTitle><Progress value={(wizardStep/3)*100} className="h-1 mt-2" /></DialogHeader>
          <div className="py-4 space-y-4">
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-2">
                <div><Label>Town Name</Label><Input value={newTown.town_name} onChange={e => setNewTown({...newTown, town_name: e.target.value})} /></div>
                <div><Label>State</Label><Select value={newTown.state} onValueChange={v => setNewTown({...newTown, state: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['NH','ME','MA','VT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-2">
                <div><Label>Admin Email</Label><Input value={newTown.contact_email} onChange={e => setNewTown({...newTown, contact_email: e.target.value})} /></div>
                <div><Label>Address</Label><Input value={newTown.address} onChange={e => setNewTown({...newTown, address: e.target.value})} /></div>
              </div>
            )}
            {wizardStep === 3 && <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 italic">Ready to finalize {newTown.town_name}. Dashboard access will be immediate.</div>}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => setWizardStep(s => s - 1)} disabled={wizardStep === 1}>Back</Button>
            {wizardStep < 3 ? <Button onClick={() => setWizardStep(s => s + 1)}>Next</Button> : <Button onClick={handleCreateTown} disabled={isUpdatingStatus}>Complete Onboarding</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmingTown} onOpenChange={() => setConfirmingTown(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Confirm Status Change</DialogTitle></DialogHeader>
          <div className="p-4 bg-slate-50 border rounded-lg text-xs">{confirmingTown?.is_active ? "🚨 Locking staff out immediately." : "✅ Restoring dashboard access."}</div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setConfirmingTown(null)}>Cancel</Button>
            <Button variant={confirmingTown?.is_active ? "destructive" : "default"} onClick={handleToggleActive} disabled={isUpdatingStatus}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

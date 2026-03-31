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
  AlertTriangle, CheckCircle, Loader2, UserPlus, X, Edit, Globe, Copy, Calendar, Activity, Zap, History, Clock
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

  const [towns, setTowns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Maintenance State
  const [isMaintenance, setIsMaintenance] = useState(appPublicSettings?.is_maintenance_active || false);
  const [maintenanceNote, setMaintenanceNote] = useState(appPublicSettings?.maintenance_notice || "Planned updates in progress.");

  // Wizard & Dialog States
  const [confirmingTown, setConfirmingTown] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTown, setNewTown] = useState({ town_name: '', state: 'NH', address: '', contact_email: '', contact_phone: '', tagline: '' });

  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteTownId, setInviteTownId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

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
        base44.entities.Case.list('-created_date', 500),
      ]);
      setTowns(townsData || []);
      setAllUsers(usersRes.data?.users || []);
      setAllCases(casesData || []);
    } catch (err) { console.error("Load failed:", err); }
    setLoading(false);
  }

  // --- MAINTENANCE LOGIC ---
  const handleToggleMaintenance = async () => {
    const action = isMaintenance ? "DISABLE" : "ENABLE";
    if (!window.confirm(`${action} Global Maintenance Mode? This affects ALL municipal users.`)) return;
    setIsUpdatingStatus(true);
    try {
      await base44.entities.AppSettings.update('global_config', {
        is_maintenance_active: !isMaintenance,
        maintenance_notice: maintenanceNote,
      });
      setIsMaintenance(!isMaintenance);
      await checkAppState(); // Refresh global context
    } catch (err) { alert("Failed to update system status."); }
    setIsUpdatingStatus(false);
  };

  // --- ANALYTICS ---
  const systemMetrics = useMemo(() => {
    const months = {};
    const heatmap = {};
    allCases.forEach(c => {
      const date = new Date(c.created_date);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      months[key] = (months[key] || 0) + 1;
      heatmap[c.town_id] = (heatmap[c.town_id] || 0) + 1;
    });
    return {
      caseHistory: Object.entries(months).slice(-6),
      activityHeatmap: heatmap,
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

  // --- HANDLERS ---
  const handleCreateTown = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await base44.functions.invoke('setupNewTown', { ...newTown, is_active: true, agreement_accepted_at: new Date().toISOString(), agreement_accepted_by: user?.email });
      if (res.data?.success) { setWizardOpen(false); load(); }
    } catch (err) { alert("Error: " + err.message); }
    setIsUpdatingStatus(false);
  };

  const handleExportCSV = () => {
    const headers = ['Town Name', 'Town ID', 'Status', 'Cases'];
    const rows = filteredTowns.map(t => [t.town_name, t.id, t.is_active ? 'Active' : 'Inactive', systemMetrics.activityHeatmap[t.id] || 0]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
  };

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  if (user?.role !== 'superadmin') return <div className="p-8 text-center">Access denied.</div>;
  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-slate-50/30 min-h-screen">
      
      {/* MAINTENANCE CONTROLS */}
      <div className="mb-8 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isMaintenance ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              System Status: <span className={isMaintenance ? 'text-red-400' : 'text-emerald-400'}>{isMaintenance ? 'Maintenance' : 'Live'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} className="h-9 text-xs bg-white/5 border-white/10 text-slate-300 w-full sm:w-80" />
            <Button size="sm" variant={isMaintenance ? "destructive" : "outline"} onClick={handleToggleMaintenance} disabled={isUpdatingStatus} className="font-bold border-white/10">
              {isMaintenance ? "Disable Maintenance" : "Enable Maintenance"}
            </Button>
          </div>
        </div>
      </div>

      {/* STATS & GROWTH */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Towns" value={towns.length} color="purple" />
          <StatCard icon={Users} label="Users" value={allUsers.length} color="blue" />
          <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
          <StatCard icon={Zap} label="Growth" value={`+${towns.filter(t => new Date(t.created_date) > new Date(Date.now() - 30*24*60*60*1000)).length}`} color="orange" />
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4"><span className="text-[10px] font-bold uppercase text-slate-500">Case Volume</span><TrendingUp className="w-3.5 h-3.5 text-blue-500" /></div>
          <div className="flex items-end justify-between h-20 gap-1.5 px-2">
            {systemMetrics.caseHistory.map(([month, count]) => (
              <div key={month} className="flex-1 bg-blue-500/10 border-t border-blue-500/30 rounded-t-sm group relative" style={{ height: `${(count / (Math.max(...systemMetrics.caseHistory.map(s => s[1])) || 1)) * 100}%` }}>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="towns">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="towns">Towns</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Button onClick={() => { setWizardStep(1); setWizardOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"><Plus className="w-4 h-4" /> New Town</Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="bg-white border-slate-200 text-slate-600 gap-2"><Download className="w-3.5 h-3.5" /> Export</Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-white border-slate-200 shadow-sm" />
            </div>
          </div>
        </div>

        <TabsContent value="towns" className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTowns.map(t => (
            <div key={t.id} className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col ${!t.is_active ? 'border-orange-200 bg-orange-50/20 grayscale-[0.3]' : 'hover:border-blue-300'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border shadow-inner">
                  {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-slate-400" />}
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border shadow-sm">
                  <Checkbox checked={t.is_active} onCheckedChange={() => setConfirmingTown(t)} />
                  <Label className="text-[10px] font-bold uppercase">{t.is_active ? 'Active' : 'Inactive'}</Label>
                </div>
              </div>
              <h3 className="font-bold text-lg">{t.town_name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t.state} — {t.id.slice(0,8)}</p>
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border">
                  <code className="text-[10px] font-mono text-slate-500 truncate">{t.id}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(t.id)}>
                    {copiedId === t.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </Button>
                </div>
                <Button onClick={() => impersonateMunicipality(t)} className={`w-full font-bold ${t.is_active ? 'bg-slate-800 text-white' : 'bg-orange-600 text-white'}`}>
                  {t.is_active ? 'Enter Town' : 'Troubleshoot'}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="audit">
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {systemMetrics.recentLogs.map((log, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div><p className="text-sm font-medium">Activity in {log.town_id.slice(0,8)}</p><p className="text-xs text-slate-500">Case ID: {log.id}</p></div>
                </div>
                <div className="text-right flex items-center gap-2 text-slate-400"><Clock className="w-3 h-3" /><span className="text-xs">{new Date(log.updated_date || log.created_date).toLocaleString()}</span></div>
              </div>
            ))}
          </div>
        </TabsContent>
        {/* Users & Invite tabs content continues here... */}
      </Tabs>

      {/* WIZARD DIALOG */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Town Onboarding</DialogTitle><Progress value={(wizardStep/3)*100} className="h-1 mt-2" /></DialogHeader>
          <div className="py-4 space-y-4">
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={newTown.town_name} onChange={e => setNewTown({...newTown, town_name: e.target.value})} /></div>
                <div><Label>State</Label><Select value={newTown.state} onValueChange={v => setNewTown({...newTown, state: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['NH','ME','MA','VT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div><Label>Email</Label><Input value={newTown.contact_email} onChange={e => setNewTown({...newTown, contact_email: e.target.value})} /></div>
                <div><Label>Address</Label><Input value={newTown.address} onChange={e => setNewTown({...newTown, address: e.target.value})} /></div>
              </div>
            )}
            {wizardStep === 3 && <div className="p-4 bg-blue-50 rounded-lg text-xs text-blue-800 italic">Verify {newTown.town_name} details. Creating will enable dashboard immediately.</div>}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => setWizardStep(s => s - 1)} disabled={wizardStep === 1}>Back</Button>
            {wizardStep < 3 ? <Button onClick={() => setWizardStep(s => s + 1)}>Next</Button> : <Button onClick={handleCreateTown} disabled={isUpdatingStatus}>Complete</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STATUS DIALOG */}
      <Dialog open={!!confirmingTown} onOpenChange={() => setConfirmingTown(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Confirm Status Change</DialogTitle></DialogHeader>
          <div className="p-4 bg-slate-50 border rounded-lg text-xs">{confirmingTown?.is_active ? "🚨 Users will be locked out immediately." : "✅ Restore all functionality."}</div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setConfirmingTown(null)}>Cancel</Button>
            <Button variant={confirmingTown?.is_active ? "destructive" : "default"} onClick={handleToggleActive} disabled={isUpdatingStatus}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

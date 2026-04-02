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
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Building2, Users, Plus, Trash2, Shield, FileText, Search, Download, TrendingUp,
  AlertTriangle, CheckCircle, Loader2, UserPlus, Activity, Zap, Clock, Mail, LogOut, Copy, Globe
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100"
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} flex flex-col gap-1 shadow-sm text-left`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold font-mono">{value}</span>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const { user, impersonateMunicipality, logout, appPublicSettings, checkAppState } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [towns, setTowns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMaintenance, setIsMaintenance] = useState(appPublicSettings?.is_maintenance_active || false);
  const [maintenanceNote, setMaintenanceNote] = useState(appPublicSettings?.maintenance_notice || "Planned updates in progress.");
  const [copiedId, setCopiedId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTown, setNewTown] = useState({ town_name: '', state: 'NH', contact_email: '' });

  // Confirmation State
  const [confirmingTown, setConfirmingTown] = useState(null);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    // CRITICAL: When landing here, clear any active town so the Sidebar stays hidden
    localStorage.removeItem('activeTownId');
    localStorage.removeItem('activeTownName');
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

  const systemMetrics = useMemo(() => {
    const months = {};
    const heatmap = {};
    allCases.forEach(c => {
      const date = new Date(c.created_date);
      const key = `${date.toLocaleString('default', { month: 'short' })}`;
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
      const matchesSearch = t.town_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? t.is_active : !t.is_active;
      return matchesSearch && matchesStatus;
    });
  }, [towns, searchTerm, statusFilter]);

  const enterJurisdiction = (town) => {
    // This triggers the sidebar to appear on the next page
    localStorage.setItem('activeTownId', town.id);
    localStorage.setItem('activeTownName', town.town_name);
    impersonateMunicipality(town);
  };

  if (user?.role !== 'superadmin') return <div className="p-8 text-center font-mono uppercase text-xs text-slate-500">SuperAdmin Access Required.</div>;
  if (loading) return <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-mono uppercase text-[10px] tracking-widest"><Loader2 className="animate-spin text-amber-500 w-8 h-8 mb-4" /> Accessing Command Center...</div>;

  return (
    <div className="min-h-screen bg-slate-50/50">
      
      {/* GLOBAL COMMAND HEADER */}
      <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-2xl border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded shadow-lg shadow-amber-500/20">
            <Shield className="w-5 h-5 text-slate-900" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold font-mono tracking-tighter uppercase leading-none">Command Center</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Build With Me LLC • Global System Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4 border-r border-white/10 pr-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged In As</span>
            <span className="text-xs font-mono text-amber-400">{user.email}</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={logout}
            className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 text-xs font-bold uppercase"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* GLOBAL MAINTENANCE BAR */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isMaintenance ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                System Status: <span className={isMaintenance ? 'text-red-400' : 'text-emerald-400'}>{isMaintenance ? 'MAINTENANCE MODE' : 'OPERATIONAL'}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Input 
                value={maintenanceNote} 
                onChange={(e) => setMaintenanceNote(e.target.value)} 
                className="h-8 text-[10px] bg-white/5 border-white/10 text-slate-300 w-full sm:w-64 font-mono" 
              />
              <Button size="sm" variant={isMaintenance ? "destructive" : "outline"} onClick={handleToggleMaintenance} className="h-8 text-[10px] font-bold uppercase">
                {isMaintenance ? "Go Live" : "Lock System"}
              </Button>
            </div>
          </div>
        </div>

        {/* METRICS & TRENDS */}
        <div className="grid lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Towns" value={towns.length} color="purple" />
          <StatCard icon={Users} label="Users" value={allUsers.length} color="blue" />
          <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
          
          <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-widest">Case Velocity</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-end justify-between h-8 gap-1 px-1">
              {systemMetrics.caseHistory.map(([month, count]) => (
                <div 
                  key={month} 
                  className="flex-1 bg-blue-500/20 border-t-2 border-blue-500 rounded-t-sm" 
                  style={{ height: `${(count / (Math.max(...systemMetrics.caseHistory.map(s => s[1])) || 1)) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <Tabs defaultValue="towns" className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <TabsList className="bg-white border shadow-sm p-1 h-11">
              <TabsTrigger value="towns" className="text-xs uppercase font-bold">Jurisdictions</TabsTrigger>
              <TabsTrigger value="users" className="text-xs uppercase font-bold">Personnel</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs uppercase font-bold">Global Logs</TabsTrigger>
              <TabsTrigger value="broadcast" className="text-xs uppercase font-bold">Broadcast</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  placeholder="Filter by name or ID..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-9 h-11 bg-white border-slate-200 shadow-sm text-xs" 
                />
              </div>
              <Button onClick={() => { setWizardStep(1); setWizardOpen(true); }} className="h-11 bg-slate-900 text-white gap-2 px-6 font-bold uppercase text-xs">
                <Plus className="w-4 h-4" /> New Town
              </Button>
            </div>
          </div>

          <TabsContent value="towns" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTowns.map(t => {
              const caseCount = systemMetrics.activityHeatmap[t.id] || 0;
              return (
                <div key={t.id} className={`bg-white border rounded-xl p-6 shadow-sm flex flex-col text-left transition-all hover:shadow-md ${!t.is_active ? 'border-orange-200 opacity-75' : 'hover:border-amber-500/50'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-300" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border">
                      <Checkbox checked={t.is_active} onCheckedChange={() => setConfirmingTown(t)} />
                      <span className="text-[9px] font-bold uppercase font-mono">{t.is_active ? 'Active' : 'Locked'}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{t.town_name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-6 uppercase tracking-tighter">Vault ID: {t.id}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-slate-50">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Jurisdiction</p>
                      <p className="text-xs font-bold text-slate-700">{t.state} Municipal</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Case Load</p>
                      <p className="text-xs font-bold text-blue-600">{caseCount} Records</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => enterJurisdiction(t)} 
                    className={`w-full font-bold uppercase text-[10px] tracking-widest h-10 shadow-sm ${t.is_active ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white'}`}
                  >
                    {t.is_active ? 'Enter Jurisdiction' : 'Resolve Account'}
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          {/* Additional tab contents (users, audit, broadcast) would follow similar clean styling */}
          <TabsContent value="users">
             <div className="bg-white border rounded-xl p-8 text-center font-mono text-xs text-slate-400 uppercase italic">
                Personnel Management Module Loaded
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODALS */}
      <Dialog open={!!confirmingTown} onOpenChange={() => setConfirmingTown(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono uppercase text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Security Override
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-slate-50 border rounded-lg text-[11px] font-mono uppercase leading-relaxed text-slate-600">
            {confirmingTown?.is_active 
              ? "You are about to revoke all dashboard access for this municipality. staff will be locked out immediately." 
              : "Restore administrative and field access for this municipality?"}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setConfirmingTown(null)} className="text-[10px] font-bold uppercase">Cancel</Button>
            <Button variant={confirmingTown?.is_active ? "destructive" : "default"} onClick={handleToggleActive} className="text-[10px] font-bold uppercase">Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

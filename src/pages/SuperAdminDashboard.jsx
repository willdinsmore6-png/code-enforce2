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

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Control</h1>
          <p className="text-slate-500">Global oversight and infrastructure management.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export Audit
          </Button>
          <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Provision Town
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Activity} label="Global Cases" value={allCases.length} color="blue" />
        <StatCard icon={Building2} label="Provisioned" value={towns.length} color="purple" />
        <StatCard icon={Users} label="Auth Users" value={allUsers.length} color="slate" />
        <StatCard icon={Shield} label="System Health" value="99.9%" color="orange" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="towns">Towns</TabsTrigger>
          <TabsTrigger value="users">Directory</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* THE CORRECTION: relative isolate added to contain the trend box visuals */}
              <div className="bg-white p-6 rounded-xl border shadow-sm relative isolate pointer-events-auto">
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Case Volume Trend
                </h3>
                <div className="h-[200px] w-full flex items-end gap-2 px-2">
                  {systemMetrics.caseHistory.map(([month, count]) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div 
                        className="w-full bg-blue-500/10 border-t border-blue-200 rounded-t-sm transition-all group-hover:bg-blue-500/20"
                        style={{ height: `${(count / Math.max(...systemMetrics.caseHistory.map(m => m[1]), 1)) * 100}%` }}
                      />
                      <span className="text-[10px] font-medium text-slate-400">{month.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold">Recent System Activity</h3>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="divide-y">
                  {systemMetrics.recentLogs.map((c, i) => (
                    <div key={i} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                          {c.town_id.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{c.case_number}</p>
                          <p className="text-xs text-slate-500">{c.category} • {c.town_id}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(c.created_date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" /> Global Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="text-xs font-medium">Maintenance Mode</p>
                      <p className="text-[10px] text-slate-500">Global access control</p>
                    </div>
                    <Checkbox checked={isMaintenance} onCheckedChange={handleToggleMaintenance} disabled={isUpdatingStatus} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

// FIXED: Added relative, overflow-hidden, and z-indexing to prevent the background icon or box from bleeding out
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100"
  };
  return (
    <div className={`relative overflow-hidden p-4 rounded-xl border ${colors[color]} flex flex-col gap-1 shadow-sm`}>
      <div className="flex items-center gap-2 mb-1 z-10">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold z-10">{value}</span>
      
      {/* Decorative background element - pointer-events-none ensures it doesn't block clicks */}
      <div className="absolute -right-2 -bottom-2 opacity-5 pointer-events-none">
        <Icon size={64} />
      </div>
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
      {/* Header & Stats section omitted for brevity, but they use the fixed StatCard above */}
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="towns">Town Management</TabsTrigger>
          <TabsTrigger value="users">User Directory</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Activity} label="Total Cases" value={allCases.length} color="blue" />
            <StatCard icon={Building2} label="Towns" value={towns.length} color="purple" />
            <StatCard icon={Users} label="Total Users" value={allUsers.length} color="slate" />
            <StatCard icon={Shield} label="Admins" value={allUsers.filter(u => u.role === 'admin').length} color="orange" />
          </div>

          {/* FIXED CASE VOLUME TREND BOX */}
          <div className="bg-white p-6 rounded-xl border shadow-sm relative isolate overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Case Volume Trend
              </h3>
              <span className="text-xs text-slate-400">Last 6 Months</span>
            </div>

            <div className="h-[200px] w-full flex items-end gap-2 px-2 pb-8">
              {systemMetrics.caseHistory.map(([month, count]) => {
                const maxVal = Math.max(...systemMetrics.caseHistory.map(m => m[1]), 1);
                const heightPercent = (count / maxVal) * 100;

                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip Fix: z-50 and pointer-events-none */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none shadow-lg">
                      {month}: {count} cases
                    </div>

                    {/* The Bar Fix: contained blue box */}
                    <div 
                      className="w-full bg-blue-600/10 border-t-2 border-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600/20"
                      style={{ height: `${heightPercent}%` }}
                    />
                    
                    <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 whitespace-nowrap">
                      {month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ... Rest of TabsContent (towns, users, etc) ... */}
      </Tabs>
    </div>
  );
}

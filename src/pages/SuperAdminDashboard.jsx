import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { superadminDashboardPayload } from '@/lib/actingTownInvoke';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Users,
  Plus,
  FileText,
  Search,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
  Copy,
  Trash2,
  KeyRound,
  Link2,
} from 'lucide-react';

function normalizeActive(v) {
  return String(v).toLowerCase() === 'true' || v === true;
}

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 shadow-sm ${colors[color]} text-left`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-70" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const { user, impersonateMunicipality, impersonatedMunicipality, appPublicSettings, checkAppState } = useAuth();
  const navigate = useNavigate();

  const [towns, setTowns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMaintenance, setIsMaintenance] = useState(appPublicSettings?.is_maintenance_active || false);
  const [maintenanceNote, setMaintenanceNote] = useState(
    appPublicSettings?.maintenance_notice || 'Planned updates in progress.'
  );
  const [copiedId, setCopiedId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newTown, setNewTown] = useState({
    town_name: '',
    state: 'NH',
    address: '',
    contact_email: '',
    contact_phone: '',
    tagline: '',
  });

  const [confirmingTown, setConfirmingTown] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [relinkEmail, setRelinkEmail] = useState('');
  const [relinkTownId, setRelinkTownId] = useState('');
  const [relinkBusy, setRelinkBusy] = useState(false);
  const [relinkMsg, setRelinkMsg] = useState(null);
  const [pwdResetUser, setPwdResetUser] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    load();
  }, [user, impersonatedMunicipality]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    const warnings = [];

    try {
      const casesPromise = impersonatedMunicipality
        ? base44.entities.Case.filter({ town_id: impersonatedMunicipality.id }, '-created_date', 1000)
        : base44.entities.Case.list('-created_date', 1000);

      const [townsSettled, usersSettled, casesSettled] = await Promise.allSettled([
        base44.functions.invoke('listTownsForSuperadmin', superadminDashboardPayload({})),
        base44.functions.invoke('getUsers', { all: true }),
        casesPromise,
      ]);

      let rawTowns = [];
      if (townsSettled.status === 'fulfilled') {
        const tr = townsSettled.value;
        if (tr.data?.error) {
          warnings.push(`Towns (function): ${tr.data.error}`);
        } else {
          rawTowns = tr.data?.towns || [];
        }
      } else {
        warnings.push(`Towns (function): ${townsSettled.reason?.message || String(townsSettled.reason)}`);
      }

      const townsFnFailed =
        townsSettled.status === 'rejected' ||
        (townsSettled.status === 'fulfilled' && townsSettled.value?.data?.error);
      if (!rawTowns.length && townsFnFailed) {
        try {
          const fallback = await base44.entities.TownConfig.list('-created_date', 500);
          if (fallback?.length) {
            rawTowns = fallback;
            warnings.push(
              'Loaded towns via client TownConfig.list(). Ensure listTownsForSuperadmin is deployed (functionsDir + entry.ts layout) for preview/production.'
            );
          }
        } catch (fe) {
          warnings.push(`Towns (client fallback): ${fe.message || 'failed'}`);
        }
      }

      setTowns(
        rawTowns.map((t) => ({
          ...t,
          is_active: normalizeActive(t.is_active),
        }))
      );

      if (usersSettled.status === 'fulfilled') {
        const ur = usersSettled.value;
        if (ur.data?.error) {
          warnings.push(`Users: ${ur.data.error}`);
          setAllUsers([]);
        } else {
          setAllUsers(ur.data?.users || []);
        }
      } else {
        warnings.push(`Users: ${usersSettled.reason?.message || String(usersSettled.reason)}`);
        setAllUsers([]);
      }

      if (casesSettled.status === 'fulfilled') {
        setAllCases(casesSettled.value || []);
      } else {
        warnings.push(`Cases: ${casesSettled.reason?.message || String(casesSettled.reason)}`);
        setAllCases([]);
      }

      if (warnings.length) {
        setLoadError(warnings.join('\n'));
      }
    } catch (err) {
      console.error('Load failed:', err);
      setLoadError(err.message || 'Unexpected load error');
    }
    setLoading(false);
  }

  const systemMetrics = useMemo(() => {
    const months = {};
    const heatmap = {};
    allCases.forEach((c) => {
      const date = new Date(c.created_date);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      months[key] = (months[key] || 0) + 1;
      if (c.town_id) heatmap[c.town_id] = (heatmap[c.town_id] || 0) + 1;
    });
    return {
      caseHistory: Object.entries(months).slice(-6),
      activityHeatmap: heatmap,
      recentLogs: allCases.slice(0, 25),
    };
  }, [allCases]);

  const filteredTowns = useMemo(() => {
    return towns.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.town_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.short_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? t.is_active : !t.is_active;
      return matchesSearch && matchesStatus;
    });
  }, [towns, searchTerm, statusFilter]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (!q) return true;
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || u.name || '').toLowerCase();
      const tid = (u.town_id || u.data?.town_id || '').toLowerCase();
      return email.includes(q) || name.includes(q) || tid.includes(q);
    });
  }, [allUsers, userSearch]);

  const townNameById = useMemo(() => {
    const m = {};
    towns.forEach((t) => {
      m[t.id] = t.town_name || t.short_name || t.id;
    });
    return m;
  }, [towns]);

  const handleToggleMaintenance = async () => {
    if (!window.confirm(`Toggle Global Maintenance Mode?`)) return;
    setIsUpdatingStatus(true);
    try {
      await base44.entities.AppSettings.update('global_config', {
        is_maintenance_active: !isMaintenance,
        maintenance_notice: maintenanceNote,
      });
      setIsMaintenance(!isMaintenance);
      await checkAppState();
    } catch (err) {
      alert('Status update failed.');
    }
    setIsUpdatingStatus(false);
  };

  const handleCreateTown = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await base44.functions.invoke(
        'setupNewTown',
        superadminDashboardPayload({
          ...newTown,
          is_active: true,
          agreement_accepted_at: new Date().toISOString(),
          agreement_accepted_by: user?.email,
        })
      );
      if (res.data?.success) {
        setWizardOpen(false);
        load();
      }
    } catch (err) {
      alert(err.message);
    }
    setIsUpdatingStatus(false);
  };

  const handleExportCSV = () => {
    const headers = ['Town', 'ID', 'Status', 'Total Cases'];
    const rows = filteredTowns.map((t) => [
      t.town_name,
      t.id,
      t.is_active ? 'Active' : 'Inactive',
      systemMetrics.activityHeatmap[t.id] || 0,
    ]);
    const csv = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_enforce_audit.csv`;
    a.click();
  };

  async function handleToggleActive() {
    if (!confirmingTown) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = !confirmingTown.is_active;
      await base44.entities.TownConfig.update(confirmingTown.id, { is_active: newStatus });
      setTowns((prev) =>
        prev.map((t) => (t.id === confirmingTown.id ? { ...t, is_active: newStatus } : t))
      );
      setConfirmingTown(null);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Update failed');
    }
    setIsUpdatingStatus(false);
  }

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  async function handleDeleteUser() {
    if (!userToDelete || userToDelete.id === user?.id) return;
    setIsUpdatingStatus(true);
    try {
      await base44.functions.invoke(
        'deleteUser',
        superadminDashboardPayload({ userId: userToDelete.id })
      );
      setAllUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
    setIsUpdatingStatus(false);
  }

  async function handleRelinkUser(e) {
    e.preventDefault();
    if (!relinkEmail.trim() || !relinkTownId) return;
    setRelinkBusy(true);
    setRelinkMsg(null);
    try {
      const res = await base44.functions.invoke(
        'relinkUserByEmail',
        superadminDashboardPayload({ email: relinkEmail.trim(), town_id: relinkTownId })
      );
      const d = res?.data;
      if (d?.success) {
        setRelinkMsg({ ok: true, text: d.message || 'Done.' });
        setRelinkEmail('');
        await load();
      } else if (d?.error) {
        setRelinkMsg({ ok: false, text: `${d.detail || d.error}. ${d.hint || ''}`.trim() });
      } else {
        setRelinkMsg({ ok: false, text: 'Unexpected response from server.' });
      }
    } catch (err) {
      const extra = err?.response?.data || err?.data;
      const text = extra?.hint
        ? `${extra.detail || extra.error || ''}. ${extra.hint}`.trim()
        : err.message || 'Failed';
      setRelinkMsg({ ok: false, text });
    }
    setRelinkBusy(false);
  }

  async function handleUserTownChange(u, townId) {
    const nextTown = townId === '__none__' ? null : townId;
    setIsUpdatingStatus(true);
    try {
      await base44.functions.invoke(
        'updateUserTown',
        superadminDashboardPayload({ userId: u.id, town_id: nextTown })
      );
      setAllUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, town_id: nextTown, data: { ...row.data, town_id: nextTown } } : row
        )
      );
    } catch (err) {
      alert(err.message || 'Could not move user');
    }
    setIsUpdatingStatus(false);
  }

  async function handleUserRoleChange(u, role) {
    if (u.id === user?.id) return;
    setIsUpdatingStatus(true);
    try {
      await base44.functions.invoke(
        'updateUserRole',
        superadminDashboardPayload({ userId: u.id, role })
      );
      setAllUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, role } : row)));
    } catch (err) {
      alert(err.message || 'Could not update role');
    }
    setIsUpdatingStatus(false);
  }

  async function handleSendPasswordReset() {
    if (!pwdResetUser?.email) return;
    setIsUpdatingStatus(true);
    try {
      const res = await base44.functions.invoke(
        'adminResetPassword',
        superadminDashboardPayload({ email: pwdResetUser.email })
      );
      if (res.data?.error) throw new Error(res.data.error);
      alert(res.data?.message || 'Password reset email sent.');
      setPwdResetUser(null);
    } catch (err) {
      alert(err?.message || err?.data?.error || 'Failed to send reset email');
    }
    setIsUpdatingStatus(false);
  }

  if (user?.role !== 'superadmin')
    return <div className="p-8 text-center text-slate-500">SuperAdmin Access Required.</div>;
  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 sm:p-6 lg:p-8">
      {impersonatedMunicipality && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are viewing as <strong>{impersonatedMunicipality.town_name}</strong>. Case metrics below are scoped to that town.
          Town and user lists still show <strong>all</strong> municipalities. Use the purple banner to exit when finished.
        </div>
      )}

      {loadError && (
        <div className="mb-4 whitespace-pre-wrap rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Dashboard data notice:</strong> {loadError}
        </div>
      )}

      <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isMaintenance ? 'animate-pulse bg-red-500' : 'bg-emerald-500'}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Global Status:{' '}
              <span className={isMaintenance ? 'text-red-400' : 'text-emerald-400'}>
                {isMaintenance ? 'Maintenance' : 'Operational'}
              </span>
            </span>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Input
              value={maintenanceNote}
              onChange={(e) => setMaintenanceNote(e.target.value)}
              className="h-9 w-full border-white/10 bg-white/5 text-xs text-slate-300 sm:w-80"
            />
            <Button
              size="sm"
              variant={isMaintenance ? 'destructive' : 'outline'}
              onClick={handleToggleMaintenance}
              disabled={isUpdatingStatus}
            >
              {isMaintenance ? 'Disable Lock' : 'Enable Maintenance'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-2">
          <StatCard icon={Building2} label="Towns" value={towns.length} color="purple" />
          <StatCard icon={Users} label="Users" value={allUsers.length} color="blue" />
          <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
          <StatCard
            icon={Zap}
            label="Growth"
            value={`+${towns.filter((t) => new Date(t.created_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}`}
            color="orange"
          />
        </div>

        <div className="flex min-h-[140px] h-full flex-col rounded-xl border bg-white p-4 shadow-sm text-left">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Case Volume Trend
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="flex h-full items-end justify-between gap-1.5 px-2">
            {systemMetrics.caseHistory.map(([month, count]) => {
              const maxH =
                systemMetrics.caseHistory.length > 0
                  ? Math.max(...systemMetrics.caseHistory.map((s) => s[1]), 1)
                  : 1;
              return (
              <div
                key={month}
                className="group relative flex-1 rounded-t-sm border-t border-blue-500/30 bg-blue-500/10"
                style={{
                  height: `${(count / maxH) * 100}%`,
                }}
              >
                <div className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {count}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <Tabs defaultValue="towns">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <TabsList className="border bg-white shadow-sm">
            <TabsTrigger value="towns" className="text-xs font-bold uppercase">
              Towns
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs font-bold uppercase">
              Users
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-bold uppercase">
              Activity
            </TabsTrigger>
          </TabsList>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <Button
              onClick={() => {
                setWizardStep(1);
                setWizardOpen(true);
              }}
              className="gap-2 bg-blue-600 text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> New Town
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 border-slate-200 bg-white text-slate-600"
            >
              <Download className="h-3.5 w-3.5" /> Export Towns CSV
            </Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search towns…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-slate-200 bg-white pl-9 shadow-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full border-slate-200 bg-white sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="towns" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTowns.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              No towns match your filters. If this list should not be empty, deploy the{' '}
              <code className="rounded bg-slate-100 px-1">listTownsForSuperadmin</code> function and sync the app.
            </div>
          )}
          {filteredTowns.map((t) => {
            const caseCount = systemMetrics.activityHeatmap[t.id] || 0;
            return (
              <div
                key={t.id}
                className={`flex flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition-all ${
                  !t.is_active ? 'border-orange-200 bg-orange-50/20 grayscale-[0.25]' : 'hover:border-blue-400'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50 shadow-inner">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Building2 className="h-7 w-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1 shadow-sm">
                    <Checkbox
                      checked={t.is_active}
                      onCheckedChange={() => setConfirmingTown(t)}
                      id={`active-${t.id}`}
                    />
                    <Label htmlFor={`active-${t.id}`} className="cursor-pointer text-[10px] font-bold uppercase">
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
                <h3 className="mb-0.5 text-lg font-bold leading-tight">{t.town_name}</h3>
                {t.short_name && t.short_name !== t.town_name && (
                  <p className="text-xs text-slate-500">{t.short_name}</p>
                )}
                {t.tagline && <p className="mb-2 text-xs text-slate-600">{t.tagline}</p>}
                <div className="mb-3 space-y-1 text-[11px] text-slate-600">
                  {t.contact_email && <p>Email: {t.contact_email}</p>}
                  {t.contact_phone && <p>Phone: {t.contact_phone}</p>}
                  {t.address && <p className="leading-snug">{t.address}</p>}
                </div>
                <p className="mb-3 font-mono text-[10px] text-slate-400">town_id: {t.id}</p>
                <p className="mb-3 text-xs text-slate-500">{caseCount} case(s) in current metrics scope</p>

                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between rounded-lg border bg-slate-100/50 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      {t.state} · {t.is_active ? 'Subscription can manage access' : 'Manual inactive'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(t.id)}>
                      {copiedId === t.id ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => impersonateMunicipality(t)}
                    className={`w-full font-bold shadow-sm ${
                      t.is_active ? 'bg-slate-800 text-white' : 'bg-orange-600 text-white'
                    }`}
                  >
                    {t.is_active ? 'Enter town (act as admin)' : 'Troubleshoot (enter town)'}
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search users by name, email, town id…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="border-slate-200 bg-white pl-9"
            />
          </div>
          <p className="text-xs text-slate-600">
            Tech support: edit anyone&apos;s display profile, send password-reset email, move between towns, or remove accounts. These
            actions use <strong>global superadmin</strong> scope (not limited to an impersonated town).
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-left shadow-sm">
            <p className="mb-1 text-sm font-semibold text-amber-950">Recover a deleted user / stuck email</p>
            <p className="mb-3 text-xs text-amber-900">
              Removing someone from the list only deletes their app profile row. Their email may still exist in Base44, so new invites can
              fail. Use this to attach them to a town again, or to send a fresh invite when the platform allows it.
            </p>
            <form onSubmit={handleRelinkUser} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={relinkEmail}
                  onChange={(e) => setRelinkEmail(e.target.value)}
                  placeholder="user@municipality.gov"
                  className="border-amber-200 bg-white"
                />
              </div>
              <div className="min-w-[200px] space-y-1">
                <Label className="text-xs">Town</Label>
                <Select value={relinkTownId} onValueChange={setRelinkTownId}>
                  <SelectTrigger className="border-amber-200 bg-white">
                    <SelectValue placeholder="Select town" />
                  </SelectTrigger>
                  <SelectContent>
                    {towns.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.town_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={relinkBusy || !relinkEmail.trim() || !relinkTownId} className="gap-2">
                {relinkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Link or re-invite
              </Button>
            </form>
            {relinkMsg ? (
              <p className={`mt-3 text-xs ${relinkMsg.ok ? 'text-green-800' : 'text-red-700'}`}>{relinkMsg.text}</p>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Town</th>
                  <th className="px-3 py-3">town_id</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const tid = u.town_id || u.data?.town_id || '';
                  const isSuper = u.role === 'superadmin';
                  return (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium">{u.full_name || u.name || '—'}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2">
                        {u.id === user?.id ? (
                          <span className="text-slate-600">{u.role}</span>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(r) => handleUserRoleChange(u, r)}
                            disabled={isUpdatingStatus}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                              <SelectItem value="superadmin">superadmin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isSuper ? (
                          <span className="text-xs text-slate-500">—</span>
                        ) : (
                          <Select
                            value={tid || '__none__'}
                            onValueChange={(v) => handleUserTownChange(u, v)}
                            disabled={isUpdatingStatus}
                          >
                            <SelectTrigger className="h-8 max-w-[200px] text-xs">
                              <SelectValue placeholder="Town" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No town</SelectItem>
                              {towns.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.town_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {tid ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-1 font-mono text-[10px]"
                            onClick={() => copyToClipboard(tid)}
                          >
                            {copiedId === tid ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {tid.slice(0, 8)}…
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          {u.email ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600"
                              title="Send password reset email"
                              onClick={() => setPwdResetUser(u)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {u.id !== user?.id ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Delete user"
                              onClick={() => setUserToDelete(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <p className="text-sm text-slate-600">
            Recent cases {impersonatedMunicipality ? `for ${impersonatedMunicipality.town_name}` : 'across all towns'} (newest first).
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {systemMetrics.recentLogs.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-800">{c.case_number}</p>
                  <p className="text-sm text-slate-600">{c.property_address}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-0.5">{c.status}</span>
                  <span>{townNameById[c.town_id] || c.town_id || '—'}</span>
                  <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate(`/cases/${c.id}`)}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New municipality</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Town name</Label>
              <Input value={newTown.town_name} onChange={(e) => setNewTown((p) => ({ ...p, town_name: e.target.value }))} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={newTown.state} onChange={(e) => setNewTown((p) => ({ ...p, state: e.target.value }))} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={newTown.address} onChange={(e) => setNewTown((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input value={newTown.contact_email} onChange={(e) => setNewTown((p) => ({ ...p, contact_email: e.target.value }))} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={newTown.tagline} onChange={(e) => setNewTown((p) => ({ ...p, tagline: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTown} disabled={isUpdatingStatus || !newTown.town_name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmingTown} onOpenChange={() => setConfirmingTown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Town access (manual override)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
            {confirmingTown?.is_active ? (
              <>
                <p>
                  You are about to set <strong>{confirmingTown?.town_name}</strong> to <strong>inactive</strong>. Staff for that town will be
                  treated as on an inactive subscription (same as Stripe pause/cancel) unless you re-activate here.
                </p>
                <p className="text-xs text-slate-600">
                  Use this only when you intentionally need to bypass or override billing — e.g. comped pilot, billing dispute, or emergency
                  lockout.
                </p>
              </>
            ) : (
              <p>
                You are about to <strong>re-activate</strong> {confirmingTown?.town_name}. Their app access will follow normal rules again
                (and Stripe may still control billing separately).
              </p>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setConfirmingTown(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmingTown?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={isUpdatingStatus}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" /> Delete user
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Permanently remove <strong>{userToDelete?.email}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isUpdatingStatus}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwdResetUser} onOpenChange={() => setPwdResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" /> Send password reset email
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Send the standard reset instructions to <strong>{pwdResetUser?.email}</strong>? They will use the app&apos;s forgot-password
            flow from the email link.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPwdResetUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendPasswordReset} disabled={isUpdatingStatus}>
              Send email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

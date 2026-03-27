import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building2, Users, Plus, LogIn, Trash2, Shield, FileText,
  AlertTriangle, CheckCircle, Loader2, UserPlus, X, Edit, Globe, Copy
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user, impersonateMunicipality } = useAuth();
  const navigate = useNavigate();

  const [towns, setTowns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addTownOpen, setAddTownOpen] = useState(false);
  const [editTown, setEditTown] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteTownId, setInviteTownId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [townForm, setTownForm] = useState({ town_name: '', state: 'NH', contact_email: '', contact_phone: '', address: '', tagline: '' });
  const [savingTown, setSavingTown] = useState(false);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [townsData, usersRes, casesData] = await Promise.all([
      base44.entities.TownConfig.list('-created_date', 200),
      base44.functions.invoke('getUsers', {}),
      base44.entities.Case.list('-created_date', 500),
    ]);
    setTowns(townsData || []);
    setAllUsers(usersRes.data?.users || []);
    setAllCases(casesData || []);
    setLoading(false);
  }

  function enterTown(town) {
    impersonateMunicipality(town);
    navigate('/');
  }

  function townStats(townId) {
    const tc = allCases.filter(c => c.town_id === townId);
    return {
      total: tc.length,
      open: tc.filter(c => !['resolved', 'closed'].includes(c.status)).length,
      court: tc.filter(c => c.status === 'court_action').length,
    };
  }

  function townUserCount(townId) {
    return allUsers.filter(u => u.town_id === townId).length;
  }

  async function handleAddTown(e) {
    e.preventDefault();
    setSavingTown(true);
    if (editTown) {
      await base44.entities.TownConfig.update(editTown.id, townForm);
      setTowns(prev => prev.map(t => t.id === editTown.id ? { ...t, ...townForm } : t));
    } else {
      const created = await base44.entities.TownConfig.create({ ...townForm, is_active: true });
      setTowns(prev => [...prev, created]);
    }
    setSavingTown(false);
    setAddTownOpen(false);
    setEditTown(null);
    setTownForm({ town_name: '', state: 'NH', contact_email: '', contact_phone: '', address: '', tagline: '' });
  }

  function openEdit(town) {
    setEditTown(town);
    setTownForm({
      town_name: town.town_name || '',
      state: town.state || 'NH',
      contact_email: town.contact_email || '',
      contact_phone: town.contact_phone || '',
      address: town.address || '',
      tagline: town.tagline || '',
    });
    setAddTownOpen(true);
  }

  async function handleDeleteTown(town) {
    if (!window.confirm(`Delete ${town.town_name}? This will NOT delete its cases.`)) return;
    await base44.entities.TownConfig.delete(town.id);
    setTowns(prev => prev.filter(t => t.id !== town.id));
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
    if (!window.confirm(`Remove ${email}?`)) return;
    await base44.functions.invoke('deleteUser', { userId });
    setAllUsers(prev => prev.filter(u => u.id !== userId));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      // If a town was selected, try to assign after invite
      if (inviteTownId) {
        // We'll need to find the user after creation — just show a note
      }
      setInviteResult({ success: true, message: `Invited ${inviteEmail} as ${inviteRole}${inviteTownId ? '. Assign their town once they accept.' : ''}` });
      setInviteEmail(''); setInviteRole('user'); setInviteTownId('');
      const r = await base44.functions.invoke('getUsers', {});
      setAllUsers(r.data?.users || []);
    } catch (err) {
      setInviteResult({ success: false, message: err?.message || 'Failed to send invite.' });
    }
    setInviting(false);
  }

  if (user?.role !== 'superadmin') {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Superadmin only.</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const totalOpen = allCases.filter(c => !['resolved', 'closed'].includes(c.status)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Global control across all municipalities</p>
          </div>
        </div>
        <Button onClick={() => { setEditTown(null); setTownForm({ town_name: '', state: 'NH', contact_email: '', contact_phone: '', address: '', tagline: '' }); setAddTownOpen(true); }} className="gap-2 bg-purple-700 hover:bg-purple-800">
          <Plus className="w-4 h-4" /> Add Town
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Total Towns" value={towns.length} color="purple" />
        <StatCard icon={Users} label="Total Users" value={allUsers.length} color="blue" />
        <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
        <StatCard icon={AlertTriangle} label="Open Cases" value={totalOpen} color="orange" />
      </div>

      <Tabs defaultValue="towns">
        <TabsList className="mb-6">
          <TabsTrigger value="towns" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Towns ({towns.length})</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users ({allUsers.length})</TabsTrigger>
        </TabsList>

        {/* TOWNS TAB */}
        <TabsContent value="towns">
          {towns.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No towns yet. Add your first municipality.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {towns.map(town => {
                const stats = townStats(town.id);
                const userCount = townUserCount(town.id);
                return (
                  <div key={town.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {town.logo_url
                            ? <img src={town.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                            : <Building2 className="w-5 h-5 text-purple-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{town.town_name}</p>
                          <p className="text-xs text-muted-foreground">{town.state} · {userCount} user{userCount !== 1 ? 's' : ''}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[140px]">{town.id}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(town.id); }}
                              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                              title="Copy town_id"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                      </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(town)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteTown(town)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-lg font-bold">{stats.total}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-orange-700">{stats.open}</p>
                        <p className="text-[10px] text-orange-600">Open</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-red-700">{stats.court}</p>
                        <p className="text-[10px] text-red-600">Court</p>
                      </div>
                    </div>

                    <Button onClick={() => enterTown(town)} size="sm" className="w-full gap-2 bg-purple-700 hover:bg-purple-800">
                      <LogIn className="w-3.5 h-3.5" /> Enter as Admin
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users">
          {/* Invite Form */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold">Invite User</h2>
                <p className="text-xs text-muted-foreground">Invite a new user and optionally pre-select their town</p>
              </div>
            </div>
            <form onSubmit={handleInvite} className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[180px] space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@town.gov" required />
              </div>
              <div className="space-y-1.5 min-w-[120px]">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[160px]">
                <Label>Assign to Town (optional)</Label>
                <Select value={inviteTownId} onValueChange={setInviteTownId}>
                  <SelectTrigger><SelectValue placeholder="No town yet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No town</SelectItem>
                    {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting} className="gap-1.5 bg-purple-700 hover:bg-purple-800">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Invite
              </Button>
            </form>
            {inviteResult && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {inviteResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {inviteResult.message}
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">All Users ({allUsers.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-700">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-medium">{u.full_name || <span className="italic text-muted-foreground">Pending invite</span>}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Role */}
                    <Select value={u.role || 'user'} onValueChange={val => handleRoleChange(u.id, val)}>
                      <SelectTrigger className={`h-7 text-xs px-2 w-28 border font-medium ${
                        u.role === 'superadmin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        u.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Town Assignment */}
                    <Select value={u.town_id || ''} onValueChange={val => handleTownAssign(u.id, val)}>
                      <SelectTrigger className="h-7 text-xs px-2 w-36 border border-input">
                        <SelectValue placeholder="No town" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No town</SelectItem>
                        {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {/* Remove */}
                    <button onClick={() => handleRemoveUser(u.id, u.email)} className="p-1 rounded hover:text-red-600 text-muted-foreground transition-colors" title="Remove user">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {allUsers.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">No users yet.</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Town Dialog */}
      <Dialog open={addTownOpen} onOpenChange={v => { setAddTownOpen(v); if (!v) setEditTown(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTown ? 'Edit Town' : 'Add New Town'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTown} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Town Name *</Label>
              <Input value={townForm.town_name} onChange={e => setTownForm(f => ({ ...f, town_name: e.target.value }))} placeholder="Town of Bow" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={townForm.state} onValueChange={v => setTownForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['NH','ME','VT','MA','CT','RI'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input value={townForm.tagline} onChange={e => setTownForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Code Enforcement" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={townForm.contact_email} onChange={e => setTownForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={townForm.contact_phone} onChange={e => setTownForm(f => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={townForm.address} onChange={e => setTownForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setAddTownOpen(false); setEditTown(null); }}>Cancel</Button>
              <Button type="submit" disabled={savingTown} className="bg-purple-700 hover:bg-purple-800">
                {savingTown ? 'Saving...' : editTown ? 'Save Changes' : 'Add Town'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
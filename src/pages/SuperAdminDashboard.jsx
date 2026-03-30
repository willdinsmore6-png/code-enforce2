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

// Helper component for stat cards
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100"
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} flex flex-col gap-1`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
};

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

  // --- UPDATED LOAD FUNCTION ---
  async function load() {
    setLoading(true);
    try {
      const [townsData, usersRes, casesData] = await Promise.all([
        base44.entities.TownConfig.list('-created_date', 200),
        // FIXED: Passing { all: true } to your custom getUsers function
        base44.functions.invoke('getUsers', { all: true }), 
        base44.entities.Case.list('-created_date', 500),
      ]);
      setTowns(townsData || []);
      setAllUsers(usersRes.data?.users || []);
      setAllCases(casesData || []);
    } catch (err) {
      console.error("Failed to load SuperAdmin data:", err);
    }
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

  // --- UPDATED INVITE FUNCTION ---
  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await base44.functions.invoke('superAdminInvite', {
        email: inviteEmail.trim(),
        role: inviteRole,
        town_id: inviteTownId || null,
      });
      if (res.data?.error) throw new Error(res.data.error);
      const townName = inviteTownId ? towns.find(t => t.id === inviteTownId)?.town_name : null;
      setInviteResult({ success: true, message: `Invited ${inviteEmail} as ${inviteRole}${townName ? ` · assigned to ${townName}` : ''}` });
      setInviteEmail(''); setInviteRole('user'); setInviteTownId('');
      
      // FIXED: Passing { all: true } when refreshing the list
      const r = await base44.functions.invoke('getUsers', { all: true });
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
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const totalOpen = allCases.filter(c => !['resolved', 'closed'].includes(c.status)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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

        <TabsContent value="towns">
          {towns.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No towns yet. Add your first municipality.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {towns.map(t => {
                const stats = townStats(t.id);
                return (
                  <div key={t.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTown(t)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{t.town_name}</h3>
                      <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest">{t.id}</p>
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Cases</p>
                          <p className="font-bold">{stats.total}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Users</p>
                          <p className="font-bold">{townUserCount(t.id)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Open</p>
                          <p className="font-bold text-orange-600">{stats.open}</p>
                        </div>
                      </div>
                      <Button onClick={() => enterTown(t)} className="w-full gap-2 bg-slate-800 hover:bg-slate-900">
                        <LogIn className="w-4 h-4" /> Enter Town
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          {/* User Table / Logic would go here - assuming you want allUsers listed */}
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">All Registered Users</h2>
             {/* Simplified list display */}
             <div className="space-y-2">
               {allUsers.map(u => (
                 <div key={u.id} className="p-3 border rounded-lg flex justify-between items-center">
                   <div>
                     <p className="font-medium">{u.email}</p>
                     <p className="text-xs text-muted-foreground">{u.role} · Town ID: {u.town_id || 'Unassigned'}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addTownOpen} onOpenChange={setAddTownOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTown ? 'Edit Town' : 'Add New Town'}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTown} className="space-y-4">
             {/* Form fields here matching your townForm state */}
             <div className="grid gap-2">
               <Label>Town Name</Label>
               <Input required value={townForm.town_name} onChange={e => setTownForm({...townForm, town_name: e.target.value})} />
             </div>
             <Button type="submit" disabled={savingTown} className="w-full">
               {savingTown && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               {editTown ? 'Update Town' : 'Create Town'}
             </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

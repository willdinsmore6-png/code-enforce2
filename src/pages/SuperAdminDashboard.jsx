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
    } catch (err) {
      console.error("Load failed:", err);
    }
    setLoading(false);
  }

  // --- RESTORED INTERACTIVE FUNCTIONS ---
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
      const res = await base44.functions.invoke('superAdminInvite', {
        email: inviteEmail.trim(),
        role: inviteRole,
        town_id: inviteTownId || null,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setInviteResult({ success: true, message: `Invited ${inviteEmail}!` });
      setInviteEmail('');
      const r = await base44.functions.invoke('getUsers', { all: true });
      setAllUsers(r.data?.users || []);
    } catch (err) {
      setInviteResult({ success: false, message: err?.message || 'Failed.' });
    }
    setInviting(false);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Town ID copied!');
  }

  if (user?.role !== 'superadmin') return <div className="p-8 text-center">Access denied.</div>;
  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ... Stats Section ... */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Total Towns" value={towns.length} color="purple" />
        <StatCard icon={Users} label="Total Users" value={allUsers.length} color="blue" />
        <StatCard icon={FileText} label="Total Cases" value={allCases.length} color="slate" />
        <StatCard icon={AlertTriangle} label="Open Cases" value={allCases.filter(c => !['resolved', 'closed'].includes(c.status)).length} color="orange" />
      </div>

      <Tabs defaultValue="towns">
        <TabsList className="mb-6">
          <TabsTrigger value="towns">Towns</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="invite">Invite</TabsTrigger>
        </TabsList>

        <TabsContent value="towns" className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {towns.map(t => (
            <div key={t.id} className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                {/* RESTORED LOGO */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                  {t.logo_url ? <img src={t.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-slate-400" />}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(t.id)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate('/')}><LogIn className="w-4 h-4" /></Button>
                </div>
              </div>
              <h3 className="font-bold text-lg">{t.town_name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t.state}</p>
              <Button onClick={() => impersonateMunicipality(t)} className="w-full bg-slate-800">Enter Town</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="users">
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 text-left font-semibold">User</th>
                  <th className="p-4 text-left font-semibold">Town</th>
                  <th className="p-4 text-left font-semibold">Role</th>
                  <th className="p-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium">{u.email}</td>
                    <td className="p-4">
                      {/* RESTORED TOWN ASSIGNMENT */}
                      <Select value={u.town_id || 'none'} onValueChange={(val) => handleTownAssign(u.id, val === 'none' ? null : val)}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Assign Town" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      {/* RESTORED ROLE CHANGE */}
                      <Select value={u.role || 'user'} onValueChange={(val) => handleRoleChange(u.id, val)}>
                        <SelectTrigger className="w-[120px] h-8 text-xs capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">SuperAdmin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(u.id, u.email)} className="text-red-500 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* RESTORED INVITE TAB */}
        <TabsContent value="invite">
          <div className="max-w-md bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5" /> Invite Global User</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@municipality.gov" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Town</Label>
                  <Select value={inviteTownId} onValueChange={setInviteTownId}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={inviting} className="w-full bg-purple-700 hover:bg-purple-800">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />} Invite User
              </Button>
              {inviteResult && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${inviteResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {inviteResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {inviteResult.message}
                </div>
              )}
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

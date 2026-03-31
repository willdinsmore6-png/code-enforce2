import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Building2, Users, Plus, LogIn, Trash2, Shield, FileText,
  AlertTriangle, CheckCircle, Loader2, UserPlus, X, Edit, Globe, Copy, Calendar
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
  
  // Subscription Tracking State
  const [confirmingTown, setConfirmingTown] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Helper to calculate days active based on created_date
  const getDaysActive = (createdDate) => {
    if (!createdDate) return 0;
    const start = new Date(createdDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  async function handleToggleActive() {
    if (!confirmingTown) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = !confirmingTown.is_active;
      await base44.entities.TownConfig.update(confirmingTown.id, { is_active: newStatus });
      
      setTowns(prev => prev.map(t => t.id === confirmingTown.id ? { ...t, is_active: newStatus } : t));
      setConfirmingTown(null);
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Failed to update town status.");
    } finally {
      setIsUpdatingStatus(false);
    }
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
          {towns.map(t => {
            const daysActive = getDaysActive(t.created_date);
            return (
              <div key={t.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${!t.is_active ? 'border-orange-200 bg-orange-50/20 grayscale-[0.5]' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border">
                    {t.logo_url ? <img src={t.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-slate-400" />}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Subscription Status Toggle */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border shadow-sm">
                      <Checkbox 
                        id={`status-${t.id}`} 
                        checked={t.is_active} 
                        onCheckedChange={() => setConfirmingTown(t)}
                      />
                      <Label htmlFor={`status-${t.id}`} className="text-[10px] font-bold uppercase cursor-pointer">
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Label>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(t.id)}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}><LogIn className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-lg">{t.town_name}</h3>
                  {/* --- NEW: DAYS ACTIVE BADGE --- */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold">
                    <Calendar className="w-3 h-3" />
                    {daysActive} Days
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-4">{t.state}</p>
                <Button onClick={() => impersonateMunicipality(t)} className={`w-full ${t.is_active ? 'bg-slate-800' : 'bg-orange-600'}`}>
                  {t.is_active ? 'Enter Town' : 'Troubleshoot Town'}
                </Button>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="users">
          {/* ... existing users table code ... */}
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
                      <Select 
                        value={u.town_id || "Null"} 
                        onValueChange={(val) => handleTownAssign(u.id, val === "Null" ? null : val)}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="No Town" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Null">None (Unassigned)</SelectItem>
                          {towns.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Select 
                        value={u.role} 
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger className="h-8 w-[120px]">
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 h-8 w-8"
                        onClick={() => handleRemoveUser(u.id, u.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="invite">
          {/* ... existing invite form code ... */}
          <div className="max-w-md bg-white border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Invite New User</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="officer@town.gov" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Initial Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">SuperAdmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign Town</Label>
                  <Select value={inviteTownId} onValueChange={setInviteTownId}>
                    <SelectTrigger><SelectValue placeholder="Select Town" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Null">None</SelectItem>
                      {towns.map(t => <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={inviting}>
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invitation"}
              </Button>
              {inviteResult && (
                <div className={`p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {inviteResult.message}
                </div>
              )}
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* Safety Prompt Dialog */}
      <Dialog open={!!confirmingTown} onOpenChange={() => setConfirmingTown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              You are about to {confirmingTown?.is_active ? <span className="text-red-600 font-bold">DEACTIVATE</span> : <span className="text-emerald-600 font-bold">ACTIVATE</span>} <strong>{confirmingTown?.town_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-slate-50 p-4 rounded-lg text-xs space-y-2 border">
            {confirmingTown?.is_active ? (
              <p>🚨 <strong>Warning:</strong> All users in this town will be locked out of their dashboards immediately and redirected to the subscription page.</p>
            ) : (
              <p>✅ <strong>Action:</strong> This will restore dashboard access for all authorized municipal staff.</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setConfirmingTown(null)} disabled={isUpdatingStatus}>
              Cancel
            </Button>
            <Button 
              variant={confirmingTown?.is_active ? "destructive" : "default"} 
              onClick={handleToggleActive}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

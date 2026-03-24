import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Mail, Trash2, Search } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

export default function SuperAdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user', municipality_id: '' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'superadmin') { navigate('/'); return; }
    load();
  }, [user]);

  async function load() {
    const [usersRes, munis] = await Promise.all([
      base44.functions.invoke('getUsers', {}),
      base44.entities.Municipality.list('-created_date', 200),
    ]);
    setAllUsers(usersRes.data?.users || []);
    setMunicipalities(munis);
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.municipality_id) return;
    setInviting(true);
    
    try {
      await base44.functions.invoke('inviteMunicipalityUser', {
        email: inviteForm.email,
        role: inviteForm.role,
        municipality_id: inviteForm.municipality_id,
      });
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'user', municipality_id: '' });
      load();
    } catch (err) {
      console.error('Invite failed:', err);
    }
    setInviting(false);
  }

  async function assignUserToMuni(userId, municipalityId) {
    if (!municipalityId) return;
    const muni = municipalities.find(m => m.id === municipalityId);
    await base44.functions.invoke('updateUserMunicipality', {
      user_id: userId,
      municipality_id: municipalityId,
      municipality_name: muni?.short_name || muni?.name,
    });
    load();
  }

  const filtered = allUsers.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingUsers = filtered.filter(u => !u.municipality_id && u.role !== 'superadmin');
  const assignedUsers = filtered.filter(u => u.municipality_id);

  if (user?.role !== 'superadmin') return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="User Management"
        description="Manage all users across municipalities"
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Invite User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Invite User to Municipality</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Municipality *</Label>
                  <Select value={inviteForm.municipality_id} onValueChange={v => setInviteForm(p => ({ ...p, municipality_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select municipality..." /></SelectTrigger>
                    <SelectContent>
                      {municipalities.map(m => <SelectItem key={m.id} value={m.id}>{m.short_name || m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviting}>{inviting ? 'Inviting...' : 'Invite'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-amber-900 mb-3">Pending Access ({pendingUsers.length})</h3>
          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.full_name || '(No name)'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="w-48">
                  <Select onValueChange={v => assignUserToMuni(u.id, v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assign to municipality..." /></SelectTrigger>
                    <SelectContent>
                      {municipalities.map(m => <SelectItem key={m.id} value={m.id}>{m.short_name || m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
          <h2 className="font-semibold">All Users ({filtered.length})</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 w-48 h-8 text-sm" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-border">
            {assignedUsers.map(u => {
              const muni = municipalities.find(m => m.id === u.municipality_id);
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {muni?.short_name || muni?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                  <span className="text-xs text-muted-foreground">{u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy') : ''}</span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No users found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
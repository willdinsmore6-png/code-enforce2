import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Building2, Plus, Users, FileText, CheckCircle, XCircle, Search, Settings, LogIn, Bell } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function SuperAdminDashboard() {
  const { user, impersonateMunicipality } = useAuth();
  const navigate = useNavigate();
  const [municipalities, setMunicipalities] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', municipality_id: '', role: 'admin' });
  const [inviting, setInviting] = useState(false);
  const [createMuniOpen, setCreateMuniOpen] = useState(false);
  const [muniForm, setMuniForm] = useState({ name: '', short_name: '', municipality_type: 'town', state: 'NH', contact_email: '', admin_email: '' });
  const [creatingMuni, setCreatingMuni] = useState(false);

  useEffect(() => {
    if (user?.role !== 'superadmin') { navigate('/'); return; }
    load();
  }, [user]);

  async function load() {
    const [munis, usersRes, casesData] = await Promise.all([
      base44.entities.Municipality.list('-created_date', 200),
      base44.functions.invoke('getUsers', {}),
      base44.entities.Case.list('-created_date', 500),
    ]);
    setMunicipalities(munis);
    setAllUsers(usersRes.data?.users || []);
    setCases(casesData);
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    await base44.users.inviteUser(inviteForm.email, inviteForm.role);
    // Note: municipality_id will be set when admin sets up or is assigned
    setInviteOpen(false);
    setInviting(false);
    setInviteForm({ email: '', municipality_id: '', role: 'admin' });
    load();
  }

  async function handleCreateMuni(e) {
    e.preventDefault();
    setCreatingMuni(true);
    const res = await base44.functions.invoke('createMunicipality', muniForm);
    setCreatingMuni(false);
    setCreateMuniOpen(false);
    setMuniForm({ name: '', short_name: '', municipality_type: 'town', state: 'NH', contact_email: '', admin_email: '' });
    load();
  }

  async function toggleActive(muni) {
    await base44.entities.Municipality.update(muni.id, { is_active: !muni.is_active });
    setMunicipalities(prev => prev.map(m => m.id === muni.id ? { ...m, is_active: !m.is_active } : m));
  }

  function handleEnterMuni(muni) {
    impersonateMunicipality(muni);
    navigate('/');
  }

  async function assignMunicipalityToUser(userId, municipalityId) {
    const muni = municipalities.find(m => m.id === municipalityId);
    await base44.functions.invoke('updateUserMunicipality', { user_id: userId, municipality_id: municipalityId, municipality_name: muni?.short_name || muni?.name });
    load();
  }

  const filtered = municipalities.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.state?.toLowerCase().includes(search.toLowerCase())
  );

  const casesByMuni = {};
  cases.forEach(c => { if (c.municipality_id) casesByMuni[c.municipality_id] = (casesByMuni[c.municipality_id] || 0) + 1; });
  const usersByMuni = {};
  allUsers.forEach(u => { if (u.municipality_id) usersByMuni[u.municipality_id] = (usersByMuni[u.municipality_id] || 0) + 1; });

  if (user?.role !== 'superadmin') return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Super Admin Dashboard"
        description="Manage all municipalities, users, and system-wide settings"
        actions={
          <div className="flex gap-2">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5"><Users className="w-4 h-4" /> Invite Admin</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Invite Municipality Admin</DialogTitle></DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Municipality Admin</SelectItem>
                        <SelectItem value="user">Municipality Staff</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">After inviting, assign them to a municipality from the Users tab below.</p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={inviting}>{inviting ? 'Inviting...' : 'Send Invite'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={createMuniOpen} onOpenChange={setCreateMuniOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Municipality</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Municipality</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateMuni} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Official Name *</Label>
                      <Input value={muniForm.name} onChange={e => setMuniForm(p => ({ ...p, name: e.target.value }))} placeholder="Town of Concord" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Short Name</Label>
                      <Input value={muniForm.short_name} onChange={e => setMuniForm(p => ({ ...p, short_name: e.target.value }))} placeholder="Concord" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={muniForm.municipality_type} onValueChange={v => setMuniForm(p => ({ ...p, municipality_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="town">Town</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="village">Village</SelectItem>
                          <SelectItem value="borough">Borough</SelectItem>
                          <SelectItem value="township">Township</SelectItem>
                          <SelectItem value="county">County</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>State *</Label>
                      <Select value={muniForm.state} onValueChange={v => setMuniForm(p => ({ ...p, state: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Admin Email</Label>
                      <Input type="email" value={muniForm.admin_email} onChange={e => setMuniForm(p => ({ ...p, admin_email: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Contact Email</Label>
                      <Input type="email" value={muniForm.contact_email} onChange={e => setMuniForm(p => ({ ...p, contact_email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateMuniOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={creatingMuni}>{creatingMuni ? 'Creating...' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Pending Users Alert */}
      {(() => {
        const pendingUsers = allUsers.filter(u => !u.municipality_id && u.role !== 'superadmin');
        if (pendingUsers.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-amber-800">Pending Access Requests ({pendingUsers.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium">{u.full_name || '(No name yet)'}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · Signed up {u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy h:mm a') : ''}</p>
                  </div>
                  <div className="w-52">
                    <Select onValueChange={v => assignMunicipalityToUser(u.id, v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assign & approve..." /></SelectTrigger>
                      <SelectContent>
                        {municipalities.map(m => <SelectItem key={m.id} value={m.id}>{m.short_name || m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3">Assign a municipality to grant these users access to the app.</p>
          </div>
        );
      })()}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatBox label="Municipalities" value={municipalities.length} icon={Building2} color="text-blue-600 bg-blue-50" />
        <StatBox label="Total Users" value={allUsers.length} icon={Users} color="text-purple-600 bg-purple-50" />
        <StatBox label="Total Cases" value={cases.length} icon={FileText} color="text-amber-600 bg-amber-50" />
        <StatBox label="Active Municipalities" value={municipalities.filter(m => m.is_active).length} icon={CheckCircle} color="text-green-600 bg-green-50" />
      </div>

      {/* Municipalities table */}
      <div className="bg-card rounded-xl border border-border mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
          <h2 className="font-semibold">Municipalities</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 w-48 h-8 text-sm" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.logo_url ? <img src={m.logo_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Building2 className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.municipality_type} · {m.state} · {m.contact_email || 'No email set'}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{casesByMuni[m.id] || 0} cases</span>
                  <span>{usersByMuni[m.id] || 0} users</span>
                  <span className="text-[10px]">{m.created_date ? format(new Date(m.created_date), 'MMM d, yyyy') : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(m)} className="text-xs h-7">
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEnterMuni(m)} className="text-xs h-7 gap-1 text-purple-700 hover:text-purple-800 hover:bg-purple-50">
                    <LogIn className="w-3.5 h-3.5" /> Enter
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No municipalities found.</div>
            )}
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">All Users</h2>
        </div>
        <div className="divide-y divide-border">
          {allUsers.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'superadmin' ? 'bg-purple-50 text-purple-700' : u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {u.role}
              </span>
              <div className="w-52">
                <Select
                  value={u.municipality_id || ''}
                  onValueChange={v => assignMunicipalityToUser(u.id, v)}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assign municipality..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>— None —</SelectItem>
                    {municipalities.map(m => <SelectItem key={m.id} value={m.id}>{m.short_name || m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
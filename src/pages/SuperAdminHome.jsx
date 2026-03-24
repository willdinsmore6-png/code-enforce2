import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Users, FileText, CheckCircle, LogIn, Search, Settings, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function SuperAdminHome() {
  const { user } = useAuth();
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [muniForm, setMuniForm] = useState({ name: '', short_name: '', municipality_type: 'town', state: 'NH', contact_email: '', admin_email: '' });
  const [creatingMuni, setCreatingMuni] = useState(false);
  const [casesByMuni, setCasesByMuni] = useState({});
  const [usersByMuni, setUsersByMuni] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [munis, usersRes, casesData] = await Promise.all([
        base44.entities.Municipality.list('-created_date', 200),
        base44.functions.invoke('getUsers', {}),
        base44.entities.Case.list('-created_date', 500),
      ]);
      setMunicipalities(munis);
      
      const caseMap = {};
      casesData.forEach(c => { if (c.municipality_id) caseMap[c.municipality_id] = (caseMap[c.municipality_id] || 0) + 1; });
      setCasesByMuni(caseMap);

      const userMap = {};
      usersRes.data?.users?.forEach(u => { if (u.municipality_id) userMap[u.municipality_id] = (userMap[u.municipality_id] || 0) + 1; });
      setUsersByMuni(userMap);

      setLoading(false);
    }
    load();
  }, []);

  async function handleCreateMuni(e) {
    e.preventDefault();
    setCreatingMuni(true);
    await base44.functions.invoke('createMunicipality', muniForm);
    setCreatingMuni(false);
    setCreateOpen(false);
    setMuniForm({ name: '', short_name: '', municipality_type: 'town', state: 'NH', contact_email: '', admin_email: '' });
    const munis = await base44.entities.Municipality.list('-created_date', 200);
    setMunicipalities(munis);
  }

  function handleEnterMuni(muni) {
    // Navigate to municipal dashboard — the auth context will show municipal app based on municipality_id
    navigate('/');
  }

  const filtered = municipalities.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.state?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all municipalities, users, and system settings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatBox label="Municipalities" value={municipalities.length} icon={Building2} color="text-blue-600 bg-blue-50" />
        <StatBox label="Active" value={municipalities.filter(m => m.is_active).length} icon={CheckCircle} color="text-green-600 bg-green-50" />
        <StatBox label="Total Cases" value={Object.values(casesByMuni).reduce((a, b) => a + b, 0)} icon={FileText} color="text-amber-600 bg-amber-50" />
        <StatBox label="Total Users" value={Object.values(usersByMuni).reduce((a, b) => a + b, 0)} icon={Users} color="text-purple-600 bg-purple-50" />
      </div>

      <div className="bg-card rounded-xl border border-border mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3 flex-wrap">
          <h2 className="font-semibold">Municipalities ({filtered.length})</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 w-48 h-8 text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/superadmin/users')} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Users className="w-4 h-4" /> All Users
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Municipality</Button>
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
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={creatingMuni}>{creatingMuni ? 'Creating...' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {m.logo_url ? <img src={m.logo_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Building2 className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.municipality_type} · {m.state} · {m.contact_email || 'No email'}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{casesByMuni[m.id] || 0} cases</span>
                <span>{usersByMuni[m.id] || 0} users</span>
                <span>{m.created_date ? format(new Date(m.created_date), 'MMM d, yyyy') : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handleEnterMuni(m)} className="text-xs h-7 gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> Manage
              </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No municipalities found.</div>
          )}
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
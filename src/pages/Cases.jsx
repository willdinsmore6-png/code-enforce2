import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Search, Filter, ArrowRight, Building2, User, Calendar, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

const violationLabels = {
  zoning: 'Zoning', building_code: 'Building Code', health_safety: 'Health & Safety',
  signage: 'Signage', setback: 'Setback', use_violation: 'Use Violation',
  junkyard: 'Junkyard', septic: 'Septic', wetlands: 'Wetlands', other: 'Other'
};

export default function Cases() {
  const { municipality } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      // SECURITY: Only fetch if a municipality ID is present to ensure data isolation
      if (!municipality?.id) {
        setLoading(false);
        return;
      }
      
      const data = await base44.entities.Case.filter(
        { town_id: municipality.id }, 
        '-created_date', 
        100
      );
      setCases(data);
      setLoading(false);
    }
    load();
  }, [municipality]);

  const filtered = cases.filter(c => {
    const matchesSearch = !searchTerm || 
      c.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.property_owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Case Registry" 
        description={`Official enforcement records for ${municipality?.town_name || 'your municipality'}`}
        actions={
          <Link to="/new-complaint">
            <Button className="shadow-lg shadow-primary/20 gap-2"><Plus className="w-4 h-4" /> New Complaint</Button>
          </Link>
        }
      />

      {/* --- SMART METRICS BAR --- */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold shadow-md">
          <Building2 className="w-3.5 h-3.5" /> {cases.length} Total Cases
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" /> {cases.filter(c => c.priority === 'high').length} High Priority
        </div>
      </div>

      {/* --- FILTER & SEARCH --- */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search address, case #, or owner..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-muted/30 border-none"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 h-11">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {['all', 'intake', 'investigation', 'notice_sent', 'awaiting_response', 'citation_issued', 'court_action', 'resolved', 'closed'].map(s => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Case Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Property Location</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-muted/20 transition-all">
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded uppercase">
                      {c.case_number || c.id.slice(0, 5)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-primary transition-colors">{c.property_address}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" /> {c.property_owner_name || 'No Owner Listed'}
                    </p>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <span className="text-xs font-bold text-slate-500 italic">{violationLabels[c.violation_type] || c.violation_type}</span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link to={`/cases/${c.id}`}>
                      <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Search, Filter } from 'lucide-react';
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
      const data = municipality
        ? await base44.entities.Case.filter({ town_id: municipality.id }, '-created_date', 100)
        : await base44.entities.Case.list('-created_date', 100);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Cases" 
        description="All enforcement cases and violations"
        actions={
          <Link to="/new-complaint">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Complaint</Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by address, case #, or owner..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="intake">Intake</SelectItem>
            <SelectItem value="investigation">Investigation</SelectItem>
            <SelectItem value="notice_sent">Notice Sent</SelectItem>
            <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
            <SelectItem value="citation_issued">Citation Issued</SelectItem>
            <SelectItem value="court_action">Court Action</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Case #</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Property</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/cases/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                      {c.case_number || c.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium truncate max-w-[200px]">{c.property_address}</p>
                    {c.property_owner_name && (
                      <p className="text-xs text-muted-foreground">{c.property_owner_name}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{violationLabels[c.violation_type] || c.violation_type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <StatusBadge status={c.priority} type="priority" />
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {c.complaint_date ? format(new Date(c.complaint_date), 'MMM d, yyyy') : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'all' ? 'No cases match your filters.' : 'No cases yet. Create a complaint to get started.'}
          </div>
        )}
      </div>
    </div>
  );
}
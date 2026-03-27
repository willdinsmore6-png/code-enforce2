import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, AlertTriangle, Scale, Clock, CheckCircle, TrendingUp, ArrowRight, Building2 } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function Dashboard() {
  const { user, impersonatedMunicipality } = useAuth();
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperadmin = user?.role === 'superadmin';
  const townId = impersonatedMunicipality?.id || (isSuperadmin ? null : user?.town_id);

  useEffect(() => {
    async function load() {
      if (!townId) {
        setCases([]);
        setDeadlines([]);
        setLoading(false);
        return;
      }
      const [casesData, deadlinesData] = await Promise.all([
        base44.entities.Case.filter({ town_id: townId }, '-created_date', 50),
        base44.entities.Deadline.filter({ town_id: townId, is_completed: false }, 'due_date', 20),
      ]);
      setCases(casesData);
      setDeadlines(deadlinesData);
      setLoading(false);
    }
    load();
  }, [townId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openCases = cases.filter(c => !['resolved', 'closed'].includes(c.status));
  const courtCases = cases.filter(c => c.status === 'court_action');
  const awaitingCases = cases.filter(c => c.status === 'awaiting_response');
  const resolvedThisMonth = cases.filter(c => {
    if (c.status !== 'resolved' || !c.resolution_date) return false;
    const d = new Date(c.resolution_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const urgentDeadlines = deadlines.filter(d => {
    const daysLeft = differenceInDays(new Date(d.due_date), new Date());
    return daysLeft <= 7 && daysLeft >= 0;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Dashboard" 
        description="Overview of all enforcement cases and upcoming deadlines"
        actions={
          <Link to="/new-complaint">
            <Button>New Complaint</Button>
          </Link>
        }
      />

      <h2 className="text-lg font-semibold mb-4">Case Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" role="region" aria-label="Case overview statistics">
        <StatCard icon={FileText} label="Open Cases" value={openCases.length} />
        <StatCard icon={Clock} label="Awaiting Response" value={awaitingCases.length} />
        <StatCard icon={Scale} label="In Court" value={courtCases.length} />
        <StatCard icon={CheckCircle} label="Resolved (Month)" value={resolvedThisMonth.length} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Cases</h2>
            <Link to="/cases" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {cases.slice(0, 6).map(c => (
              <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.case_number || `Case #${c.id.slice(0, 8)}`}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.property_address}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {c.complaint_date ? format(new Date(c.complaint_date), 'MMM d') : ''}
                </span>
              </Link>
            ))}
            {cases.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No cases yet. Create your first complaint to get started.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Upcoming Deadlines</h2>
            <Link to="/deadlines" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {urgentDeadlines.slice(0, 5).map(d => {
              const daysLeft = differenceInDays(new Date(d.due_date), new Date());
              return (
                <div key={d.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(d.due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      daysLeft <= 2 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </span>
                  </div>
                </div>
              );
            })}
            {urgentDeadlines.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No urgent deadlines in the next 7 days.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
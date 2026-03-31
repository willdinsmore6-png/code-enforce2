import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { 
  FileText, 
  AlertTriangle, 
  Scale, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight, 
  Building2,
  Calendar,
  Zap,
  ChevronRight
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function Dashboard() {
  const { user, municipality } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const townFilter = municipality ? { town_id: municipality.id } : null;
      const [casesData, deadlinesData] = await Promise.all([
        townFilter ? base44.entities.Case.filter(townFilter, '-created_date', 50) : base44.entities.Case.list('-created_date', 50),
        townFilter ? base44.entities.Deadline.filter({ ...townFilter, is_completed: false }, 'due_date', 20) : base44.entities.Deadline.filter({ is_completed: false }, 'due_date', 20),
      ]);
      setCases(casesData);
      setDeadlines(deadlinesData);
      setLoading(false);
    }
    load();
  }, [municipality]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // --- Core Calculation Functions ---
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

  const overdueCount = deadlines.filter(d => {
    const daysLeft = differenceInDays(new Date(d.due_date), new Date());
    return daysLeft < 0 && !d.is_completed;
  }).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title={`Welcome back, ${user?.name || 'Officer'}`} 
        description={`Command center for ${municipality?.name || 'your municipality'}`}
        actions={
          <div className="flex gap-2">
            <Link to="/new-complaint">
              <Button className="shadow-lg shadow-primary/20">
                <Zap className="w-4 h-4 mr-2 fill-current" />
                New Complaint
              </Button>
            </Link>
          </div>
        }
      />

      {/* --- High-Urgency Alert Banner --- */}
      {(overdueCount > 0 || urgentDeadlines.length > 0) && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-center gap-4 text-destructive shadow-sm">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-destructive">Action Required</p>
            <p className="text-xs text-destructive/80">
              You have {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'} and {urgentDeadlines.length} items due this week.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-destructive/10 text-destructive" onClick={() => navigate('/deadlines')}>
            Resolve Now <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* --- Case Overview Stats --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Case statistics">
        <StatCard icon={FileText} label="Open Cases" value={openCases.length} className="border-l-4 border-l-blue-500 shadow-md transition-all cursor-default" />
        <StatCard icon={Clock} label="Pending" value={awaitingCases.length} className="border-l-4 border-l-amber-500 shadow-md transition-all cursor-default" />
        <StatCard icon={Scale} label="In Court" value={courtCases.length} className="border-l-4 border-l-red-500 shadow-md transition-all cursor-default" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolvedThisMonth.length} className="border-l-4 border-l-green-500 shadow-md transition-all cursor-default" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* --- Main Content: Recent Activity Feed --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">Recent Enforcement Activity</h2>
              </div>
              <Link to="/cases" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Full Registry <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-border">
              {cases.slice(0, 6).map(c => (
                <Link 
                  key={c.id} 
                  to={`/cases/${c.id}`} 
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                        {c.property_address || `Case #${c.id.slice(0, 8)}`}
                      </p>
                      <StatusBadge status={c.status} className="scale-90" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Updated {c.updated_at ? format(new Date(c.updated_at), 'MMM d, h:mm a') : 'Recently'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
              {cases.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  <div className="inline-block p-3 bg-muted rounded-full mb-3">
                    <FileText className="w-6 h-6 opacity-20" />
                  </div>
                  <p>No cases yet. Start by filing a new complaint.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Sidebar: High-Urgency Timeline --- */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Timeline
              </h2>
              <Link to="/deadlines" className="text-[10px] uppercase font-black tracking-widest text-white/40 hover:text-white transition-colors">
                View All
              </Link>
            </div>
            
            <div className="space-y-4 relative z-10">
              {urgentDeadlines.length > 0 ? (
                urgentDeadlines.slice(0, 5).map(d => {
                  const daysLeft = differenceInDays(new Date(d.due_date), new Date());
                  return (
                    <div key={d.id} className="group relative pl-4 border-l border-white/10 hover:border-primary transition-colors">
                      <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-white/20 group-hover:bg-primary group-hover:animate-ping" />
                      <div className="mb-1 flex justify-between items-start">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          daysLeft <= 1 ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-900'
                        }`}>
                          {daysLeft === 0 ? 'TODAY' : `${daysLeft}D LEFT`}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-tight line-clamp-2 text-white/90 group-hover:text-white transition-colors">{d.description}</p>
                      <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(d.due_date), 'MMM do')}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                  <p className="text-xs text-white/30 italic">No urgent deadlines</p>
                </div>
              )}
            </div>

            <Button 
              variant="secondary" 
              className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white border-0"
              onClick={() => navigate('/deadlines')}
            >
              Check Full Schedule
            </Button>
          </div>

          {/* --- Quick Resource Links --- */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Resources</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/report" className="p-3 bg-muted/50 rounded-xl hover:bg-primary/5 transition-colors text-center border border-transparent hover:border-primary/20 group">
                <TrendingUp className="w-4 h-4 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase text-foreground">Reports</span>
              </Link>
              <Link to="/resource-library" className="p-3 bg-muted/50 rounded-xl hover:bg-primary/5 transition-colors text-center border border-transparent hover:border-primary/20 group">
                <FileText className="w-4 h-4 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase text-foreground">Library</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format, differenceInDays, isPast as isDatePast, isToday } from 'date-fns';

export default function Deadlines() {
  const { impersonatedMunicipality } = useAuth();
  const [deadlines, setDeadlines] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      const townFilter = impersonatedMunicipality ? { town_id: impersonatedMunicipality.id } : null;
      const [dl, c] = await Promise.all([
        townFilter ? base44.entities.Deadline.filter(townFilter, 'due_date', 100) : base44.entities.Deadline.list('due_date', 100),
        townFilter ? base44.entities.Case.filter(townFilter, '-created_date', 100) : base44.entities.Case.list('-created_date', 100),
      ]);
      setDeadlines(dl);
      setCases(c);
      setLoading(false);
    }
    load();
  }, [impersonatedMunicipality]);

  async function markComplete(deadlineId) {
    await base44.entities.Deadline.update(deadlineId, {
      is_completed: true,
      completed_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setDeadlines(prev => prev.map(d => d.id === deadlineId ? { ...d, is_completed: true } : d));
  }

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  const filtered = deadlines.filter(d => showCompleted || !d.is_completed);

  // Grouping logic for "Spiced Up" layout
  const overdue = filtered.filter(d => !d.is_completed && differenceInDays(new Date(d.due_date), new Date()) < 0);
  const dueSoon = filtered.filter(d => !d.is_completed && differenceInDays(new Date(d.due_date), new Date()) >= 0 && differenceInDays(new Date(d.due_date), new Date()) <= 3);
  const upcoming = filtered.filter(d => !d.is_completed && differenceInDays(new Date(d.due_date), new Date()) > 3);
  const completed = filtered.filter(d => d.is_completed);

  const typeLabels = {
    abatement: 'Abatement',
    zba_appeal: 'ZBA Appeal',
    court_appearance: 'Court',
    response_due: 'Response',
    filing_deadline: 'Filing',
    follow_up: 'Follow Up',
    custom: 'Task',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const DeadlineCard = ({ d }) => {
    const daysLeft = differenceInDays(new Date(d.due_date), new Date());
    const isOverdue = daysLeft < 0 && !d.is_completed;
    const isUrgent = daysLeft <= 3 && daysLeft >= 0;
    const linkedCase = caseMap[d.case_id];

    return (
      <div className={`group relative bg-card rounded-2xl border p-5 flex items-center gap-5 transition-all hover:shadow-md ${
        d.is_completed ? 'opacity-60 border-border' : isOverdue ? 'border-red-200 bg-red-50/30' : 'border-border'
      }`}>
        {/* Left Accent Bar */}
        <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
          d.is_completed ? 'bg-green-500' : isOverdue ? 'bg-red-500 animate-pulse' : isUrgent ? 'bg-amber-500' : 'bg-primary/20'
        }`} />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          d.is_completed ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {d.is_completed ? <CheckCircle className="w-6 h-6" /> : isOverdue ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-foreground truncate">{d.description}</h3>
            <StatusBadge status={d.priority} type="priority" className="scale-75 origin-left" />
          </div>
          
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              {typeLabels[d.deadline_type] || d.deadline_type}
            </span>
            {linkedCase && (
              <Link to={`/cases/${d.case_id}`} className="text-primary hover:underline flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                {linkedCase.case_number || linkedCase.property_address?.slice(0, 20)}
              </Link>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0 px-4 border-r border-border">
          <p className="text-sm font-black text-foreground">
            {isToday(new Date(d.due_date)) ? 'TODAY' : format(new Date(d.due_date), 'MMM d')}
          </p>
          {!d.is_completed && (
            <p className={`text-[10px] font-bold uppercase tracking-tighter ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {isOverdue ? `${Math.abs(daysLeft)}d Overdue` : `${daysLeft}d Remaining`}
            </p>
          )}
        </div>

        {!d.is_completed && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => markComplete(d.id)} 
            className="flex-shrink-0 rounded-full hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  const SectionHeader = ({ title, count, colorClass }) => (
    <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
      <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h2>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${colorClass}`}>
        {count}
      </span>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Compliance Timeline"
        description="Monitor critical dates and upcoming legal windows"
        actions={
          <Button 
            variant={showCompleted ? "default" : "outline"} 
            size="sm" 
            onClick={() => setShowCompleted(!showCompleted)}
            className="shadow-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showCompleted ? 'Showing All' : 'Hide Completed'}
          </Button>
        }
      />

      <div className="flex flex-col gap-2">
        {overdue.length > 0 && (
          <>
            <SectionHeader title="Overdue" count={overdue.length} colorClass="bg-red-500" />
            {overdue.map(d => <DeadlineCard key={d.id} d={d} />)}
          </>
        )}

        {dueSoon.length > 0 && (
          <>
            <SectionHeader title="Due This Week" count={dueSoon.length} colorClass="bg-amber-500" />
            {dueSoon.map(d => <DeadlineCard key={d.id} d={d} />)}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionHeader title="Future Tasks" count={upcoming.length} colorClass="bg-blue-500" />
            {upcoming.map(d => <DeadlineCard key={d.id} d={d} />)}
          </>
        )}

        {showCompleted && completed.length > 0 && (
          <>
            <SectionHeader title="Archive" count={completed.length} colorClass="bg-slate-400" />
            {completed.map(d => <DeadlineCard key={d.id} d={d} />)}
          </>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <div className="inline-block p-4 bg-muted rounded-full mb-4">
              <CalendarIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-bold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No active deadlines were found for your municipality.</p>
          </div>
        )}
      </div>
    </div>
  );
}

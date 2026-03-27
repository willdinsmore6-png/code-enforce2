import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format, differenceInDays } from 'date-fns';

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

  const typeLabels = {
    abatement: 'Abatement Deadline',
    zba_appeal: 'ZBA Appeal Window',
    court_appearance: 'Court Appearance',
    response_due: 'Response Due',
    filing_deadline: 'Filing Deadline',
    follow_up: 'Follow Up',
    custom: 'Custom',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Deadlines"
        description="Critical dates and compliance deadlines"
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </Button>
        }
      />

      <div className="space-y-2">
        {filtered.map(d => {
          const daysLeft = differenceInDays(new Date(d.due_date), new Date());
          const isPast = daysLeft < 0 && !d.is_completed;
          const isUrgent = daysLeft <= 3 && daysLeft >= 0;
          const linkedCase = caseMap[d.case_id];

          return (
            <div key={d.id} className={`bg-card rounded-xl border p-4 flex items-center gap-4 ${
              d.is_completed ? 'border-border opacity-60' : isPast ? 'border-red-300 bg-red-50/50' : isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-border'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                d.is_completed ? 'bg-green-50' : isPast ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-blue-50'
              }`}>
                {d.is_completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : isPast ? (
                  <Bell className="w-5 h-5 text-red-600" />
                ) : (
                  <Clock className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{d.description}</p>
                  <StatusBadge status={d.priority} type="priority" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>{typeLabels[d.deadline_type] || d.deadline_type}</span>
                  {linkedCase && (
                    <>
                      <span>•</span>
                      <Link to={`/cases/${d.case_id}`} className="text-primary hover:underline">
                        {linkedCase.case_number || linkedCase.property_address?.slice(0, 25)}
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium">{format(new Date(d.due_date), 'MMM d, yyyy')}</p>
                {!d.is_completed && (
                  <p className={`text-xs font-medium ${isPast ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {isPast ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                  </p>
                )}
              </div>
              {!d.is_completed && (
                <Button size="sm" variant="outline" onClick={() => markComplete(d.id)} className="flex-shrink-0">
                  Complete
                </Button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
            No deadlines to show.
          </div>
        )}
      </div>
    </div>
  );
}
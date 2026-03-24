import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function MunicipalityDashboard() {
  const { municipalityId } = useParams();
  const { user, municipality } = useAuth();
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verify user belongs to this municipality (unless superadmin)
  if (user && user.role !== 'superadmin' && user.municipality_id !== municipalityId) {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    async function load() {
      try {
        const [c, d] = await Promise.all([
          base44.entities.Case.filter({ municipality_id: municipalityId }, '-updated_date', 20),
          base44.entities.Deadline.filter({ municipality_id: municipalityId, is_completed: false }, 'due_date', 10),
        ]);
        setCases(c || []);
        setDeadlines(d || []);
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      }
      setLoading(false);
    }
    load();
  }, [municipalityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const urgentDeadlines = deadlines.filter(d => {
    const daysUntil = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil > 0;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{municipality?.name || 'Municipality'}</h1>
        <p className="text-muted-foreground">Dashboard and case management</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Open Cases</p>
              <p className="text-2xl font-bold">{cases.filter(c => !['resolved', 'closed'].includes(c.status)).length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Urgent Deadlines</p>
              <p className="text-2xl font-bold">{urgentDeadlines.length}</p>
            </div>
            <Clock className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold">{cases.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Urgent Deadlines */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Urgent Deadlines ({urgentDeadlines.length})</h3>
          </div>
          <div className="space-y-2">
            {urgentDeadlines.map(d => (
              <div key={d.id} className="flex justify-between items-center bg-white rounded-lg p-3 border border-red-100">
                <div>
                  <p className="text-sm font-medium">{d.description}</p>
                  <p className="text-xs text-muted-foreground">{d.deadline_type.replace('_', ' ')}</p>
                </div>
                <p className="text-sm font-semibold text-red-600">{format(new Date(d.due_date), 'MMM d')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Cases */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Cases</h2>
        </div>
        {cases.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No cases yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {cases.slice(0, 10).map(c => (
              <div key={c.id} className="px-5 py-4 hover:bg-muted/30">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm font-semibold">{c.case_number || `Case #${c.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.property_address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === 'resolved' ? 'bg-green-50 text-green-700' :
                    c.status === 'closed' ? 'bg-gray-50 text-gray-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
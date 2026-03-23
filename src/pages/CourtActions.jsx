import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Scale } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

export default function CourtActions() {
  const [courtActions, setCourtActions] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    case_id: '', action_type: 'citation_filed', court_type: 'district_court',
    filing_date: format(new Date(), 'yyyy-MM-dd'), hearing_date: '',
    court_location: '', docket_number: '', attorney_assigned: '', attorney_notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    async function load() {
      const [ca, c] = await Promise.all([
        base44.entities.CourtAction.list('-created_date', 50),
        base44.entities.Case.list('-created_date', 100),
      ]);
      setCourtActions(ca);
      setCases(c);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const ca = await base44.entities.CourtAction.create(form);
    setCourtActions(prev => [ca, ...prev]);
    if (form.case_id) {
      await base44.entities.Case.update(form.case_id, { status: 'court_action' });
    }
    if (form.hearing_date && form.case_id) {
      await base44.entities.Deadline.create({
        case_id: form.case_id,
        deadline_type: 'court_appearance',
        due_date: form.hearing_date.split('T')[0],
        description: `Court hearing — ${form.court_type.replace('_', ' ')}`,
        priority: 'critical',
      });
    }
    setOpen(false);
    setSaving(false);
  }

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

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
        title="Court Actions"
        description="Track court filings, hearings, and dispositions"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Court Action</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>File Court Action</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Case *</Label>
                  <Select value={form.case_id} onValueChange={v => update('case_id', v)} required>
                    <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                    <SelectContent>
                      {cases.filter(c => !['resolved', 'closed'].includes(c.status)).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number || c.id.slice(0, 8)} — {c.property_address?.slice(0, 30)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Action Type</Label>
                    <Select value={form.action_type} onValueChange={v => update('action_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="citation_filed">Citation Filed</SelectItem>
                        <SelectItem value="injunction_request">Injunction Request</SelectItem>
                        <SelectItem value="hearing_scheduled">Hearing Scheduled</SelectItem>
                        <SelectItem value="hearing_completed">Hearing Completed</SelectItem>
                        <SelectItem value="judgment">Judgment</SelectItem>
                        <SelectItem value="appeal">Appeal</SelectItem>
                        <SelectItem value="settlement">Settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Court Type</Label>
                    <Select value={form.court_type} onValueChange={v => update('court_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="district_court">District Court</SelectItem>
                        <SelectItem value="superior_court">Superior Court</SelectItem>
                        <SelectItem value="zba">ZBA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Filing Date</Label>
                    <Input type="date" value={form.filing_date} onChange={e => update('filing_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hearing Date/Time</Label>
                    <Input type="datetime-local" value={form.hearing_date} onChange={e => update('hearing_date', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Docket Number</Label>
                    <Input value={form.docket_number} onChange={e => update('docket_number', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attorney Assigned</Label>
                    <Input value={form.attorney_assigned} onChange={e => update('attorney_assigned', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Court Location</Label>
                  <Input value={form.court_location} onChange={e => update('court_location', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Attorney Notes</Label>
                  <Textarea value={form.attorney_notes} onChange={e => update('attorney_notes', e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Filing...' : 'File Action'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3">
        {courtActions.map(ca => {
          const linkedCase = caseMap[ca.case_id];
          return (
            <div key={ca.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold capitalize">{ca.action_type.replace(/_/g, ' ')}</p>
                    <StatusBadge status={ca.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{ca.court_type.replace('_', ' ')}</span>
                    {ca.docket_number && <><span>•</span><span>Docket: {ca.docket_number}</span></>}
                    {linkedCase && (
                      <>
                        <span>•</span>
                        <Link to={`/cases/${ca.case_id}`} className="text-primary hover:underline">
                          {linkedCase.case_number}
                        </Link>
                      </>
                    )}
                  </div>
                  {ca.hearing_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hearing: {format(new Date(ca.hearing_date), 'MMM d, yyyy h:mm a')}
                      {ca.court_location && ` • ${ca.court_location}`}
                    </p>
                  )}
                  {ca.attorney_notes && (
                    <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg p-3">{ca.attorney_notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {courtActions.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
            No court actions recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
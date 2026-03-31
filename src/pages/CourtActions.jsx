import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Scale, 
  Pencil, 
  Trash2, 
  Gavel, 
  Calendar, 
  MapPin, 
  User, 
  Hash, 
  ExternalLink, 
  Clock, 
  ChevronRight,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

const defaultForm = {
  case_id: '', action_type: 'citation_filed', court_type: 'district_court',
  filing_date: format(new Date(), 'yyyy-MM-dd'), hearing_date: '',
  court_location: '', docket_number: '', attorney_assigned: '', attorney_notes: '',
  outcome: '', status: 'pending',
};

// --- SHARED FORM COMPONENT ---
function CourtActionFormFields({ form, update, saving, onCancel, submitLabel }) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action Type</Label>
          <Select value={form.action_type} onValueChange={v => update('action_type', v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
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
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Court Jurisdiction</Label>
          <Select value={form.court_type} onValueChange={v => update('court_type', v)}>
            <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="district_court">District Court (Path A)</SelectItem>
              <SelectItem value="superior_court">Superior Court (Path B)</SelectItem>
              <SelectItem value="zba">ZBA Appeal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filing Date</Label>
          <Input type="date" value={form.filing_date} onChange={e => update('filing_date', e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hearing Date/Time</Label>
          <Input type="datetime-local" value={form.hearing_date} onChange={e => update('hearing_date', e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Docket Number</Label>
          <Input value={form.docket_number} onChange={e => update('docket_number', e.target.value)} placeholder="e.g. 217-2023-CV-001" className="h-11 rounded-xl font-mono text-xs uppercase" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign Attorney</Label>
          <Input value={form.attorney_assigned} onChange={e => update('attorney_assigned', e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filing Status</Label>
        <Select value={form.status} onValueChange={v => update('status', v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Filing</SelectItem>
            <SelectItem value="scheduled">Scheduled / Active</SelectItem>
            <SelectItem value="completed">Completed / Resolved</SelectItem>
            <SelectItem value="continued">Continued</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confidential Attorney Notes</Label>
        <Textarea value={form.attorney_notes} onChange={e => update('attorney_notes', e.target.value)} rows={3} className="rounded-xl resize-none" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold">Cancel</Button>
        <Button type="submit" disabled={saving} className="px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export default function CourtActions() {
  const { municipality } = useAuth();
  const [courtActions, setCourtActions] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCA, setEditCA] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateEdit = (field, value) => setEditCA(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    async function load() {
      if (!municipality?.id) return;
      const [ca, c] = await Promise.all([
        base44.entities.CourtAction.filter({ town_id: municipality.id }, '-created_date', 100),
        base44.entities.Case.filter({ town_id: municipality.id }, '-created_date', 200),
      ]);
      setCourtActions(ca);
      setCases(c);
      setLoading(false);
    }
    load();
  }, [municipality]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
        const ca = await base44.entities.CourtAction.create({ ...form, town_id: municipality.id });
        setCourtActions(prev => [ca, ...prev]);
        
        if (form.case_id) {
          await base44.entities.Case.update(form.case_id, { status: 'court_action' });
        }
        
        if (form.hearing_date && form.case_id) {
          await base44.entities.Deadline.create({
            case_id: form.case_id,
            deadline_type: 'court_appearance',
            due_date: form.hearing_date.split('T')[0],
            description: `Court hearing: ${form.court_type.replace('_', ' ').toUpperCase()}`,
            priority: 'critical',
            town_id: municipality.id
          });
        }
        setOpen(false);
        setForm({ ...defaultForm });
    } catch (err) {
        alert("Failed to record court action.");
    }
    setSaving(false);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    const updated = await base44.entities.CourtAction.update(editCA.id, editCA);
    setCourtActions(prev => prev.map(c => c.id === editCA.id ? { ...c, ...updated } : c));
    setSaving(false);
    setEditCA(null);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this court record permanently?")) return;
    await base44.entities.CourtAction.delete(id);
    setCourtActions(prev => prev.filter(c => c.id !== id));
  }

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Litigation Docket" 
        description="Official record of citations, injunctions, and court proceedings."
        actions={
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="shadow-lg shadow-primary/20 gap-2">
                        <Plus className="w-4 h-4" /> Log Court Filing
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Gavel className="w-5 h-5 text-primary" /> New Court Action
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Link to active case</Label>
                            <Select value={form.case_id} onValueChange={v => update('case_id', v)}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select a property..." /></SelectTrigger>
                                <SelectContent>
                                    {cases.filter(c => c.status !== 'resolved').map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.property_address}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <CourtActionFormFields form={form} update={update} saving={saving} onCancel={() => setOpen(false)} submitLabel="File to Docket" />
                    </form>
                </DialogContent>
            </Dialog>
        }
      />

      <div className="space-y-4">
        {courtActions.map(ca => {
          const linkedCase = caseMap[ca.case_id];
          return (
            <div key={ca.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="flex flex-col md:flex-row md:items-center">
                
                {/* Left Side: Jurisdiction & Status */}
                <div className={`p-6 md:w-48 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 text-center ${ca.court_type === 'superior_court' ? 'bg-indigo-50/30' : 'bg-slate-50/50'}`}>
                    <Scale className={`w-8 h-8 mb-2 ${ca.court_type === 'superior_court' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                        {ca.court_type?.replace('_', ' ')}
                    </p>
                    <div className="mt-4">
                        <StatusBadge status={ca.status} />
                    </div>
                </div>

                {/* Center: Case & Docket Info */}
                <div className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                            <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-primary transition-colors">
                                {linkedCase?.property_address || 'Unlinked Property'}
                            </h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <Hash className="w-3 h-3 text-primary" /> 
                                    <span className="font-mono tracking-tighter uppercase">{ca.docket_number || 'NO DOCKET #'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <User className="w-3 h-3" /> {ca.attorney_assigned || 'Unassigned'}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditCA(ca)}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full text-red-400 hover:text-red-600" onClick={() => handleDelete(ca.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Action Type</p>
                            <p className="text-xs font-bold text-slate-700 capitalize">{ca.action_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Filing Date</p>
                            <p className="text-xs font-bold text-slate-700">{format(new Date(ca.filing_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Hearing Date</p>
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-primary" />
                                {ca.hearing_date ? format(new Date(ca.hearing_date), 'MMM d, h:mm a') : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Location</p>
                            <p className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> {ca.court_location || '—'}
                            </p>
                        </div>
                    </div>
                </div>
              </div>

              {/* Expandable Attorney Notes Preview */}
              {ca.attorney_notes && (
                <div className="px-6 py-3 bg-slate-900/5 border-t border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[11px] font-medium text-slate-500 italic line-clamp-1">
                        Notes: {ca.attorney_notes}
                    </p>
                </div>
              )}
            </div>
          );
        })}

        {courtActions.length === 0 && (
            <div className="text-center py-24 bg-card rounded-[40px] border-2 border-dashed border-slate-200">
                <Gavel className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">No Litigation Found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                    Once you file a citation or injunction in court, log the details here to track the legal progress of the case.
                </p>
            </div>
        )}
      </div>

      {/* Edit Dialog - Uses the same shared form */}
      {editCA && (
        <Dialog open onOpenChange={() => setEditCA(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Edit Docket Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit}>
              <CourtActionFormFields form={editCA} update={updateEdit} saving={saving} onCancel={() => setEditCA(null)} submitLabel="Update Docket" />
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

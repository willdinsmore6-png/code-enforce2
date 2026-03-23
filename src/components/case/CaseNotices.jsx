import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Mail, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CaseNotices({ caseId, caseData, notices, setNotices }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    notice_type: 'first_nov',
    delivery_method: 'certified_mail',
    rsa_cited: caseData.specific_code_violated || '',
    recipient_name: caseData.property_owner_name || '',
    recipient_address: caseData.property_address || '',
    notice_content: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function createNotice(e) {
    e.preventDefault();
    setSaving(true);
    const now = new Date();
    const notice = await base44.entities.Notice.create({
      ...form,
      case_id: caseId,
      date_issued: format(now, 'yyyy-MM-dd'),
      abatement_deadline: format(addDays(now, 10), 'yyyy-MM-dd'),
      appeal_deadline: format(addDays(now, 30), 'yyyy-MM-dd'),
      appeal_instructions: 'You may appeal this notice to the Zoning Board of Adjustment (ZBA) within 30 days of receipt per NH RSA 676:5.',
      version: 1,
    });
    setNotices(prev => [...prev, notice]);
    setOpen(false);
    setSaving(false);
  }

  async function confirmDelivery(noticeId) {
    await base44.entities.Notice.update(noticeId, {
      delivery_confirmed: true,
      delivery_confirmed_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, delivery_confirmed: true, delivery_confirmed_date: format(new Date(), 'yyyy-MM-dd') } : n));
  }

  const typeLabels = {
    first_nov: 'First Notice of Violation',
    second_nov: 'Second Notice of Violation',
    cease_desist_676_17a: 'Cease & Desist (RSA 676:17-a)',
    citation_676_17b: 'Citation (RSA 676:17-b)',
    court_summons: 'Court Summons',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notices & Citations</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Notice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Notice</DialogTitle>
            </DialogHeader>
            <form onSubmit={createNotice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Notice Type</Label>
                  <Select value={form.notice_type} onValueChange={v => update('notice_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_nov">First NOV</SelectItem>
                      <SelectItem value="second_nov">Second NOV</SelectItem>
                      <SelectItem value="cease_desist_676_17a">Cease & Desist (676:17-a)</SelectItem>
                      <SelectItem value="citation_676_17b">Citation (676:17-b)</SelectItem>
                      <SelectItem value="court_summons">Court Summons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Delivery Method</Label>
                  <Select value={form.delivery_method} onValueChange={v => update('delivery_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certified_mail">Certified Mail</SelectItem>
                      <SelectItem value="first_class_mail">First Class Mail</SelectItem>
                      <SelectItem value="hand_delivered">Hand Delivered</SelectItem>
                      <SelectItem value="posted_on_property">Posted on Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>RSA / Ordinance Cited</Label>
                <Input value={form.rsa_cited} onChange={e => update('rsa_cited', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Recipient Name</Label>
                  <Input value={form.recipient_name} onChange={e => update('recipient_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Recipient Address</Label>
                  <Input value={form.recipient_address} onChange={e => update('recipient_address', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notice Content</Label>
                <Textarea value={form.notice_content} onChange={e => update('notice_content', e.target.value)} rows={4} 
                  placeholder="The notice will auto-include abatement deadline (10 days) and ZBA appeal rights (30 days)..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Notice'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {notices.map(n => (
          <div key={n.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{typeLabels[n.notice_type] || n.notice_type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Issued {n.date_issued ? format(new Date(n.date_issued), 'MMM d, yyyy') : '—'} • {n.delivery_method?.replace(/_/g, ' ')}
                  </p>
                  {n.rsa_cited && <p className="text-xs text-muted-foreground">Citing: {n.rsa_cited}</p>}
                  {n.abatement_deadline && <p className="text-xs text-muted-foreground">Abatement by: {format(new Date(n.abatement_deadline), 'MMM d, yyyy')}</p>}
                </div>
              </div>
              {n.delivery_confirmed ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Delivered
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => confirmDelivery(n.id)}>
                  Confirm Delivery
                </Button>
              )}
            </div>
          </div>
        ))}
        {notices.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground bg-card rounded-xl border border-border">
            No notices issued yet.
          </div>
        )}
      </div>
    </div>
  );
}
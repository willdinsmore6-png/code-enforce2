import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Camera } from 'lucide-react';
import { format } from 'date-fns';

export default function ZoningInvestigations({
  zoningDeterminationId,
  investigations,
  setInvestigations,
  townId: townIdProp,
}) {
  const { user, impersonatedMunicipality } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investigation_date: new Date().toISOString().slice(0, 10),
    officer_name: '',
    field_notes: '',
    evidence_summary: '',
    site_conditions: '',
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const townId = townIdProp || impersonatedMunicipality?.id || user?.town_id;
    if (!townId || !form.officer_name.trim() || !form.investigation_date) return;
    setSaving(true);
    try {
      const row = await base44.entities.Investigation.create({
        town_id: townId,
        zoning_determination_id: zoningDeterminationId,
        investigation_date: form.investigation_date,
        officer_name: form.officer_name.trim(),
        field_notes: form.field_notes.trim() || undefined,
        evidence_summary: form.evidence_summary.trim() || undefined,
        site_conditions: form.site_conditions.trim() || undefined,
      });
      setInvestigations((prev) => [row, ...prev]);
      setOpen(false);
      setForm({
        investigation_date: new Date().toISOString().slice(0, 10),
        officer_name: '',
        field_notes: '',
        evidence_summary: '',
        site_conditions: '',
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not save investigation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Site reviews & research</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Log visit / review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record zoning review</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.investigation_date}
                    onChange={(e) => setForm((f) => ({ ...f, investigation_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Officer / ZA</Label>
                  <Input
                    value={form.officer_name}
                    onChange={(e) => setForm((f) => ({ ...f, officer_name: e.target.value }))}
                    placeholder="Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Field notes</Label>
                <Textarea
                  rows={3}
                  value={form.field_notes}
                  onChange={(e) => setForm((f) => ({ ...f, field_notes: e.target.value }))}
                  placeholder="Observations, measurements, visible uses…"
                />
              </div>
              <div className="space-y-1">
                <Label>Evidence / record summary</Label>
                <Textarea
                  rows={2}
                  value={form.evidence_summary}
                  onChange={(e) => setForm((f) => ({ ...f, evidence_summary: e.target.value }))}
                  placeholder="Assessor maps, prior permits cited, GIS layers…"
                />
              </div>
              <div className="space-y-1">
                <Label>Site conditions</Label>
                <Input
                  value={form.site_conditions}
                  onChange={(e) => setForm((f) => ({ ...f, site_conditions: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3">
        {investigations.length === 0 && (
          <p className="text-sm text-muted-foreground">No site reviews logged yet.</p>
        )}
        {investigations.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {inv.investigation_date
                  ? format(new Date(inv.investigation_date), 'MMM d, yyyy')
                  : '—'}
              </span>
              <span className="text-sm text-muted-foreground">· {inv.officer_name}</span>
            </div>
            {inv.field_notes && (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{inv.field_notes}</p>
            )}
            {inv.evidence_summary && (
              <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                <span className="font-medium text-foreground">Records: </span>
                {inv.evidence_summary}
              </p>
            )}
            {inv.site_conditions && (
              <p className="mt-1 text-xs text-muted-foreground">Site: {inv.site_conditions}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

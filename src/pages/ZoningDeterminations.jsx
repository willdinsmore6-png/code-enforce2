import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ScrollText, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

function nextFileNumber(existing, year) {
  const prefix = `ZD-${year}-`;
  let max = 0;
  for (const z of existing || []) {
    const n = z.file_number;
    if (typeof n === 'string' && n.startsWith(prefix)) {
      const num = parseInt(n.slice(prefix.length), 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export default function ZoningDeterminations() {
  const { municipality, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_address: '',
    request_summary: '',
    applicant_name: '',
    parcel_id: '',
    map_block_lot: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const data = municipality?.id
          ? await base44.entities.ZoningDetermination.filter(
              { town_id: municipality.id },
              '-created_date',
              200
            )
          : await base44.entities.ZoningDetermination.list('-created_date', 200);
        setRows(data || []);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [municipality]);

  async function handleCreate(e) {
    e.preventDefault();
    const townId = municipality?.id || user?.town_id;
    if (!townId || !form.property_address.trim() || !form.request_summary.trim()) return;
    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const file_number = nextFileNumber(rows, year);
      const created = await base44.entities.ZoningDetermination.create({
        town_id: townId,
        file_number,
        status: 'draft',
        property_address: form.property_address.trim(),
        request_summary: form.request_summary.trim(),
        applicant_name: form.applicant_name.trim() || undefined,
        parcel_id: form.parcel_id.trim() || undefined,
        map_block_lot: form.map_block_lot.trim() || undefined,
      });
      setRows((prev) => [created, ...prev]);
      setOpen(false);
      setForm({
        property_address: '',
        request_summary: '',
        applicant_name: '',
        parcel_id: '',
        map_block_lot: '',
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not create file');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Zoning determinations"
        description="Administrative zoning determinations tied to a property (map-lot, parcel, address). Build the record with site reviews, exhibits, and notes — then export a PDF for the permanent file."
        helpTitle="Zoning determinations"
        helpContent={
          <>
            <p>
              Use these files for <strong>administrative zoning letters</strong> (use, structure, nonconforming status, history questions) —
              separate from violation cases unless you cross-link case IDs in the record.
            </p>
            <p>
              After opening a file, fill in the <strong>Record</strong> tab, attach documents, add site reviews and notes, then{' '}
              <strong>Export property packet</strong> for the permanent PDF.
            </p>
            <p>In <strong>Compass AI</strong>, pick your file from the zoning dropdown so the assistant reads the same context.</p>
          </>
        }
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New determination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Open new zoning file</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label>Property address *</Label>
                  <Input
                    value={form.property_address}
                    onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                    required
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Parcel ID</Label>
                    <Input
                      value={form.parcel_id}
                      onChange={(e) => setForm((f) => ({ ...f, parcel_id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Map / block / lot</Label>
                    <Input
                      value={form.map_block_lot}
                      onChange={(e) => setForm((f) => ({ ...f, map_block_lot: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Applicant / contact (optional)</Label>
                  <Input
                    value={form.applicant_name}
                    onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Scope of request *</Label>
                  <Textarea
                    rows={4}
                    value={form.request_summary}
                    onChange={(e) => setForm((f) => ({ ...f, request_summary: e.target.value }))}
                    required
                    placeholder="e.g. Is single-family use allowed by right? Is structure nonconforming? Review prior violations…"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Creating…' : 'Create file'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!municipality?.id && !user?.town_id && user?.role !== 'superadmin' && (
        <p className="text-sm text-muted-foreground">Select a municipality to view zoning files.</p>
      )}

      <div className="space-y-2 rounded-2xl border border-border/80 bg-card/90 shadow-sm">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No zoning determinations yet. Create one to start a property file.
          </div>
        ) : (
          rows.map((z) => (
            <Link
              key={z.id}
              to={`/zoning-determinations/${z.id}`}
              className="flex items-center gap-4 border-b border-border/60 px-5 py-4 transition-colors last:border-0 hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{z.file_number}</span>
                  <StatusBadge status={z.status} />
                </div>
                <p className="truncate text-sm text-muted-foreground">{z.property_address}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

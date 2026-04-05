import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Hammer, ArrowRight, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { generatePublicAccessCode } from '@/lib/publicAccessCode';
import { nextAnnualFileNumber } from '@/lib/permitLandUseFileNumbers';
import { normalizePropertyAddressKey } from '@/lib/propertyAddress';
import { initialInspectionChecklistJson } from '@/lib/buildingPermitInspections';

const PERMIT_TYPES = [
  { value: 'new_construction', label: 'New construction' },
  { value: 'alteration', label: 'Alteration / renovation' },
  { value: 'addition', label: 'Addition' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'mechanical', label: 'Mechanical / HVAC' },
  { value: 'solar', label: 'Solar / energy' },
  { value: 'other', label: 'Other' },
];

function isEntityMissingError(err) {
  const m = String(err?.message || err?.response?.data?.error || '').toLowerCase();
  return m.includes('buildingpermit') || m.includes('building_permit') || m.includes('unknown entity') || m.includes('not found');
}

export default function BuildingPermitsPage() {
  const { municipality, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_address: '',
    parcel_id: '',
    map_block: '',
    map_lot: '',
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    project_description: '',
    permit_type: 'alteration',
    valuation_estimate: '',
  });

  useEffect(() => {
    async function load() {
      setSetupRequired(false);
      try {
        const data = municipality?.id
          ? await base44.entities.BuildingPermit.filter({ town_id: String(municipality.id) }, '-created_date', 300)
          : await base44.entities.BuildingPermit.list('-created_date', 300);
        setRows(data || []);
      } catch (e) {
        console.error(e);
        if (isEntityMissingError(e)) setSetupRequired(true);
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
    if (!townId || !form.property_address.trim() || !form.project_description.trim()) return;
    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const file_number = nextAnnualFileNumber(rows, year, 'BP');
      const addr = form.property_address.trim();
      const created = await base44.entities.BuildingPermit.create({
        town_id: String(townId),
        file_number,
        public_access_code: generatePublicAccessCode(8),
        status: 'submitted',
        property_address: addr,
        property_key: normalizePropertyAddressKey(addr),
        parcel_id: form.parcel_id.trim() || undefined,
        map_block: form.map_block.trim() || undefined,
        map_lot: form.map_lot.trim() || undefined,
        applicant_name: form.applicant_name.trim() || undefined,
        applicant_email: form.applicant_email.trim() || undefined,
        applicant_phone: form.applicant_phone.trim() || undefined,
        project_description: form.project_description.trim(),
        permit_type: form.permit_type,
        valuation_estimate: form.valuation_estimate.trim() ? Number(form.valuation_estimate) : undefined,
        fee_estimate_cents: undefined,
        fee_paid_cents: 0,
        fee_notes: '',
        inspection_checklist_json: initialInspectionChecklistJson(),
        related_case_ids: '',
      });
      setRows((prev) => [created, ...prev]);
      setOpen(false);
      setForm({
        property_address: '',
        parcel_id: '',
        map_block: '',
        map_lot: '',
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        project_description: '',
        permit_type: 'alteration',
        valuation_estimate: '',
      });
    } catch (err) {
      console.error(err);
      if (isEntityMissingError(err)) setSetupRequired(true);
      alert(err.message || 'Could not create permit');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden="true" />
        <span className="sr-only">Loading permits…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Building permits & inspections"
        description="Intake permits by property, attach PDFs and photos, track fees (estimate vs paid), and run inspection checklists."
        helpTitle="Building permits"
        helpContent={
          <div className="space-y-2 text-sm">
            <p>
              Create a <strong>BuildingPermit</strong> entity in Base44 with the fields this form uses (see console error if save fails). Add{' '}
              <strong>building_permit_id</strong> to <strong>Document</strong> for file uploads.
            </p>
            <p>Public portal lookup for permits can reuse <code>public_access_code</code> once a function is deployed.</p>
          </div>
        }
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="gap-2" disabled={setupRequired}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New permit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New building permit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bp-addr">Property address *</Label>
                  <Input
                    id="bp-addr"
                    value={form.property_address}
                    onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                    required
                    autoComplete="street-address"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bp-parcel">Parcel / PID</Label>
                    <Input
                      id="bp-parcel"
                      value={form.parcel_id}
                      onChange={(e) => setForm((f) => ({ ...f, parcel_id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-type">Permit type</Label>
                    <Select value={form.permit_type} onValueChange={(v) => setForm((f) => ({ ...f, permit_type: v }))}>
                      <SelectTrigger id="bp-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMIT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bp-block">Map block</Label>
                    <Input id="bp-block" value={form.map_block} onChange={(e) => setForm((f) => ({ ...f, map_block: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-lot">Lot</Label>
                    <Input id="bp-lot" value={form.map_lot} onChange={(e) => setForm((f) => ({ ...f, map_lot: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-applicant">Applicant name</Label>
                  <Input
                    id="bp-applicant"
                    value={form.applicant_name}
                    onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bp-email">Applicant email</Label>
                    <Input
                      id="bp-email"
                      type="email"
                      value={form.applicant_email}
                      onChange={(e) => setForm((f) => ({ ...f, applicant_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-phone">Applicant phone</Label>
                    <Input
                      id="bp-phone"
                      value={form.applicant_phone}
                      onChange={(e) => setForm((f) => ({ ...f, applicant_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-val">Valuation estimate (USD, optional)</Label>
                  <Input
                    id="bp-val"
                    inputMode="decimal"
                    value={form.valuation_estimate}
                    onChange={(e) => setForm((f) => ({ ...f, valuation_estimate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-desc">Work description *</Label>
                  <Textarea
                    id="bp-desc"
                    rows={4}
                    value={form.project_description}
                    onChange={(e) => setForm((f) => ({ ...f, project_description: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create permit'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {setupRequired && (
        <div
          className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-50"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Create the BuildingPermit entity in Base44</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/85">
              Add entity <strong>BuildingPermit</strong> with fields matching this app (e.g. town_id, file_number, public_access_code, status,
              property_address, property_key, parcel_id, map_block, map_lot, applicant_*, project_description, permit_type, valuation_estimate,
              fee_estimate_cents, fee_paid_cents, fee_notes, issued_date, expires_date, denial_reason, inspection_checklist_json,
              related_case_ids). Use text or number types as appropriate; inspection_checklist_json is a long text field.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Building permits for your municipality</caption>
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th scope="col" className="p-3 font-semibold">
                File
              </th>
              <th scope="col" className="p-3 font-semibold">
                Property
              </th>
              <th scope="col" className="p-3 font-semibold">
                Status
              </th>
              <th scope="col" className="hidden p-3 font-semibold sm:table-cell">
                Type
              </th>
              <th scope="col" className="p-3 w-10 font-semibold">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !setupRequired && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No permits yet. Create one to begin.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/80 hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{r.file_number}</td>
                <td className="p-3 max-w-[200px] truncate">{r.property_address}</td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="hidden p-3 text-muted-foreground sm:table-cell">{r.permit_type?.replace(/_/g, ' ')}</td>
                <td className="p-3">
                  <Button asChild variant="ghost" size="sm" className="gap-1">
                    <Link to={`/permits/${r.id}`}>
                      Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Hammer className="h-4 w-4 shrink-0" aria-hidden="true" />
        <Link to="/property-workspace" className="font-medium text-primary underline-offset-4 hover:underline">
          Property workspace
        </Link>{' '}
        — see permits with enforcement cases by address.
      </p>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MapPin } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import StatusBadge from '@/components/shared/StatusBadge';
import BuildingPermitDocuments from '@/components/permits/BuildingPermitDocuments';
import { normalizePropertyAddressKey } from '@/lib/propertyAddress';
import { parseInspectionChecklistJson, stringifyInspectionChecklist } from '@/lib/buildingPermitInspections';

const STATUSES = ['draft', 'submitted', 'under_review', 'issued', 'denied', 'expired', 'cancelled'];

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

const INSPECTION_STATUS = ['pending', 'scheduled', 'passed', 'failed', 'waived', 'n_a'];

function parseRelatedCaseIds(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function centsToDollars(c) {
  if (c == null || c === '') return '';
  const n = Number(c);
  if (Number.isNaN(n)) return '';
  return String(n / 100);
}

function dollarsToCents(s) {
  const t = String(s || '').trim();
  if (!t) return undefined;
  const n = Math.round(parseFloat(t.replace(/[^0-9.]/g, '')) * 100);
  return Number.isNaN(n) ? undefined : n;
}

export default function BuildingPermitDetailPage() {
  const { id } = useParams();
  const { municipality, user, impersonatedMunicipality } = useAuth();

  const [row, setRow] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [relatedText, setRelatedText] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [feeEstimateDollars, setFeeEstimateDollars] = useState('');
  const [feePaidDollars, setFeePaidDollars] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await base44.entities.BuildingPermit.filter({ id });
      const r = rows?.[0];
      if (!r) {
        setError('Permit not found');
        setLoading(false);
        return;
      }
      setRow(r);
      setForm({
        property_address: r.property_address || '',
        parcel_id: r.parcel_id || '',
        map_block: r.map_block || '',
        map_lot: r.map_lot || '',
        applicant_name: r.applicant_name || '',
        applicant_email: r.applicant_email || '',
        applicant_phone: r.applicant_phone || '',
        project_description: r.project_description || '',
        permit_type: r.permit_type || 'alteration',
        status: r.status || 'submitted',
        valuation_estimate: r.valuation_estimate != null ? String(r.valuation_estimate) : '',
        fee_notes: r.fee_notes || '',
        issued_date: r.issued_date || '',
        expires_date: r.expires_date || '',
        denial_reason: r.denial_reason || '',
      });
      setRelatedText(r.related_case_ids || '');
      setFeeEstimateDollars(centsToDollars(r.fee_estimate_cents));
      setFeePaidDollars(centsToDollars(r.fee_paid_cents));
      setChecklist(parseInspectionChecklistJson(r.inspection_checklist_json));

      const townId = String(r.town_id || '');
      let docs = [];
      try {
        docs = (await base44.entities.Document.filter({ building_permit_id: id }, '-created_date', 100)) || [];
      } catch {
        docs = [];
      }
      if (!docs.length && townId) {
        const pool = (await base44.entities.Document.filter({ town_id: townId }, '-created_date', 400)) || [];
        docs = pool.filter((d) => d.building_permit_id === id);
      }
      setDocuments(docs);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load permit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (!row?.id) return;
    setSaving(true);
    try {
      const addr = form.property_address.trim();
      const updated = await base44.entities.BuildingPermit.update(row.id, {
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
        status: form.status,
        valuation_estimate: form.valuation_estimate.trim() ? Number(form.valuation_estimate) : undefined,
        fee_estimate_cents: dollarsToCents(feeEstimateDollars),
        fee_paid_cents: dollarsToCents(feePaidDollars) ?? 0,
        fee_notes: form.fee_notes.trim() || '',
        issued_date: form.issued_date || undefined,
        expires_date: form.expires_date || undefined,
        denial_reason: form.denial_reason.trim() || undefined,
        inspection_checklist_json: stringifyInspectionChecklist(checklist),
        related_case_ids: relatedText.trim() || '',
      });
      setRow(updated);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function updateChecklist(i, field, value) {
    setChecklist((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error || 'Not found'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/permits">Back to permits</Link>
        </Button>
      </div>
    );
  }

  const relatedIds = parseRelatedCaseIds(relatedText);
  const pwHref = `/property-workspace?address=${encodeURIComponent(form.property_address || row.property_address || '')}`;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/permits">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Permits
          </Link>
        </Button>
        <span className="font-mono text-sm text-muted-foreground">{row.file_number}</span>
        <StatusBadge status={row.status} />
        <HelpTip title="Public access" align="start">
          <p className="text-sm">
            Portal code: <span className="font-mono font-semibold">{row.public_access_code || '—'}</span>. Wire{' '}
            <code>lookupPermitByCode</code> later like case lookup.
          </p>
        </HelpTip>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Permit details</h2>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={pwHref}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Property workspace
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bp2-addr">Property address</Label>
              <Input
                id="bp2-addr"
                value={form.property_address}
                onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger id="bp2-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-type">Permit type</Label>
              <Select value={form.permit_type} onValueChange={(v) => setForm((f) => ({ ...f, permit_type: v }))}>
                <SelectTrigger id="bp2-type">
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
            <div className="space-y-2">
              <Label htmlFor="bp2-parcel">Parcel / PID</Label>
              <Input id="bp2-parcel" value={form.parcel_id} onChange={(e) => setForm((f) => ({ ...f, parcel_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-val">Valuation estimate</Label>
              <Input
                id="bp2-val"
                inputMode="decimal"
                value={form.valuation_estimate}
                onChange={(e) => setForm((f) => ({ ...f, valuation_estimate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-block">Map block</Label>
              <Input id="bp2-block" value={form.map_block} onChange={(e) => setForm((f) => ({ ...f, map_block: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-lot">Lot</Label>
              <Input id="bp2-lot" value={form.map_lot} onChange={(e) => setForm((f) => ({ ...f, map_lot: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-issued">Issued date</Label>
              <Input id="bp2-issued" type="date" value={form.issued_date} onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-exp">Expiration date</Label>
              <Input id="bp2-exp" type="date" value={form.expires_date} onChange={(e) => setForm((f) => ({ ...f, expires_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bp2-app">Applicant</Label>
              <Input id="bp2-app" value={form.applicant_name} onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-mail">Email</Label>
              <Input id="bp2-mail" type="email" value={form.applicant_email} onChange={(e) => setForm((f) => ({ ...f, applicant_email: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bp2-phone">Phone</Label>
              <Input id="bp2-phone" value={form.applicant_phone} onChange={(e) => setForm((f) => ({ ...f, applicant_phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp2-desc">Project description</Label>
            <Textarea id="bp2-desc" rows={4} value={form.project_description} onChange={(e) => setForm((f) => ({ ...f, project_description: e.target.value }))} />
          </div>
          {form.status === 'denied' && (
            <div className="space-y-2">
              <Label htmlFor="bp2-denial">Denial reason</Label>
              <Textarea id="bp2-denial" rows={3} value={form.denial_reason} onChange={(e) => setForm((f) => ({ ...f, denial_reason: e.target.value }))} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Fee tracker</h2>
          <p className="text-sm text-muted-foreground">Track-only — enter dollars. Does not process payments.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bp2-fee-est">Estimated fees (USD)</Label>
              <Input
                id="bp2-fee-est"
                inputMode="decimal"
                value={feeEstimateDollars}
                onChange={(e) => setFeeEstimateDollars(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp2-fee-paid">Recorded paid (USD)</Label>
              <Input id="bp2-fee-paid" inputMode="decimal" value={feePaidDollars} onChange={(e) => setFeePaidDollars(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bp2-fee-notes">Fee notes</Label>
              <Textarea id="bp2-fee-notes" rows={2} value={form.fee_notes} onChange={(e) => setForm((f) => ({ ...f, fee_notes: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Inspection checklist</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Inspection stages for this permit</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-2 font-medium">Stage</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium">Inspector</th>
                  <th className="p-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((rowc, i) => (
                  <tr key={rowc.id || i} className="border-b border-border/60">
                    <td className="p-2 align-top">{rowc.label}</td>
                    <td className="p-2 align-top">
                      <Select value={rowc.status || 'pending'} onValueChange={(v) => updateChecklist(i, 'status', v)}>
                        <SelectTrigger className="h-9" aria-label={`Status for ${rowc.label}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INSPECTION_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        type="date"
                        className="h-9"
                        value={rowc.inspected_at || ''}
                        onChange={(e) => updateChecklist(i, 'inspected_at', e.target.value)}
                        aria-label={`Inspection date for ${rowc.label}`}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        className="h-9"
                        value={rowc.inspected_by || ''}
                        onChange={(e) => updateChecklist(i, 'inspected_by', e.target.value)}
                        placeholder="Name"
                        aria-label={`Inspector for ${rowc.label}`}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <Input
                        value={rowc.notes || ''}
                        onChange={(e) => updateChecklist(i, 'notes', e.target.value)}
                        placeholder="Notes"
                        aria-label={`Notes for ${rowc.label}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Related code cases</h2>
          <p className="text-sm text-muted-foreground">Paste internal case IDs (comma or space separated).</p>
          <Textarea value={relatedText} onChange={(e) => setRelatedText(e.target.value)} rows={2} className="font-mono text-xs" />
          {relatedIds.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {relatedIds.map((cid) => (
                <li key={cid}>
                  <Link className="text-primary underline-offset-4 hover:underline" to={`/cases/${cid}`}>
                    Case {cid.slice(0, 8)}…
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <BuildingPermitDocuments
          buildingPermitId={row.id}
          documents={documents}
          setDocuments={setDocuments}
          readOnly={user?.role === 'superadmin' && !impersonatedMunicipality}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-h-[44px]">
            {saving ? 'Saving…' : 'Save permit'}
          </Button>
        </div>
      </form>
    </div>
  );
}

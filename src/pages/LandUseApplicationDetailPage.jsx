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
import LandUseApplicationDocuments from '@/components/landUse/LandUseApplicationDocuments';
import { normalizePropertyAddressKey } from '@/lib/propertyAddress';

const STATUSES = [
  'intake',
  'completeness',
  'abutter_notice',
  'hearing_scheduled',
  'continued',
  'deliberation',
  'nod_draft',
  'nod_issued',
  'withdrawn',
  'denied',
];

const APP_TYPES = [
  { value: 'pb', label: 'Planning board' },
  { value: 'zb', label: 'Zoning board' },
  { value: 'variance', label: 'Variance' },
  { value: 'special_exception', label: 'Special exception' },
  { value: 'site_plan', label: 'Site plan' },
  { value: 'subdivision', label: 'Subdivision' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];

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

export default function LandUseApplicationDetailPage() {
  const { id } = useParams();
  const { user, impersonatedMunicipality } = useAuth();

  const [row, setRow] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [relatedText, setRelatedText] = useState('');
  const [feeEstimateDollars, setFeeEstimateDollars] = useState('');
  const [feePaidDollars, setFeePaidDollars] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await base44.entities.LandUseApplication.filter({ id });
      const r = rows?.[0];
      if (!r) {
        setError('Application not found');
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
        application_type: r.application_type || 'pb',
        status: r.status || 'intake',
        fee_notes: r.fee_notes || '',
        nod_issued_date: r.nod_issued_date || '',
        nod_summary: r.nod_summary || '',
        hearing_notes: r.hearing_notes || '',
      });
      setRelatedText(r.related_case_ids || '');
      setFeeEstimateDollars(centsToDollars(r.fee_estimate_cents));
      setFeePaidDollars(centsToDollars(r.fee_paid_cents));

      const townId = String(r.town_id || '');
      let docs = [];
      try {
        docs = (await base44.entities.Document.filter({ land_use_application_id: id }, '-created_date', 100)) || [];
      } catch {
        docs = [];
      }
      if (!docs.length && townId) {
        const pool = (await base44.entities.Document.filter({ town_id: townId }, '-created_date', 400)) || [];
        docs = pool.filter((d) => d.land_use_application_id === id);
      }
      setDocuments(docs);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load');
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
      const updated = await base44.entities.LandUseApplication.update(row.id, {
        property_address: addr,
        property_key: normalizePropertyAddressKey(addr),
        parcel_id: form.parcel_id.trim() || undefined,
        map_block: form.map_block.trim() || undefined,
        map_lot: form.map_lot.trim() || undefined,
        applicant_name: form.applicant_name.trim() || undefined,
        applicant_email: form.applicant_email.trim() || undefined,
        applicant_phone: form.applicant_phone.trim() || undefined,
        project_description: form.project_description.trim(),
        application_type: form.application_type,
        status: form.status,
        fee_estimate_cents: dollarsToCents(feeEstimateDollars),
        fee_paid_cents: dollarsToCents(feePaidDollars) ?? 0,
        fee_notes: form.fee_notes.trim() || '',
        nod_issued_date: form.nod_issued_date || undefined,
        nod_summary: form.nod_summary.trim() || undefined,
        hearing_notes: form.hearing_notes.trim() || undefined,
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
          <Link to="/land-use">Back to applications</Link>
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
          <Link to="/land-use">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Applications
          </Link>
        </Button>
        <span className="font-mono text-sm text-muted-foreground">{row.file_number}</span>
        <StatusBadge status={row.status} />
        <HelpTip title="Public access" align="start">
          <p className="text-sm">
            Code: <span className="font-mono font-semibold">{row.public_access_code || '—'}</span>. Add portal lookup when ready.
          </p>
        </HelpTip>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Application</h2>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={pwHref}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Property workspace
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lu2-addr">Property address</Label>
              <Input
                id="lu2-addr"
                value={form.property_address}
                onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger id="lu2-status">
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
              <Label htmlFor="lu2-type">Type</Label>
              <Select value={form.application_type} onValueChange={(v) => setForm((f) => ({ ...f, application_type: v }))}>
                <SelectTrigger id="lu2-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-parcel">Parcel / PID</Label>
              <Input id="lu2-parcel" value={form.parcel_id} onChange={(e) => setForm((f) => ({ ...f, parcel_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-block">Map block</Label>
              <Input id="lu2-block" value={form.map_block} onChange={(e) => setForm((f) => ({ ...f, map_block: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-lot">Lot</Label>
              <Input id="lu2-lot" value={form.map_lot} onChange={(e) => setForm((f) => ({ ...f, map_lot: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-nod-date">NOD issued date</Label>
              <Input
                id="lu2-nod-date"
                type="date"
                value={form.nod_issued_date}
                onChange={(e) => setForm((f) => ({ ...f, nod_issued_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lu2-app">Applicant</Label>
              <Input id="lu2-app" value={form.applicant_name} onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-mail">Email</Label>
              <Input
                id="lu2-mail"
                type="email"
                value={form.applicant_email}
                onChange={(e) => setForm((f) => ({ ...f, applicant_email: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lu2-phone">Phone</Label>
              <Input id="lu2-phone" value={form.applicant_phone} onChange={(e) => setForm((f) => ({ ...f, applicant_phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lu2-desc">Project / request</Label>
            <Textarea id="lu2-desc" rows={4} value={form.project_description} onChange={(e) => setForm((f) => ({ ...f, project_description: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lu2-hearing">Hearing / procedural notes</Label>
            <Textarea id="lu2-hearing" rows={3} value={form.hearing_notes} onChange={(e) => setForm((f) => ({ ...f, hearing_notes: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lu2-nod">Notice of decision summary</Label>
            <Textarea id="lu2-nod" rows={4} value={form.nod_summary} onChange={(e) => setForm((f) => ({ ...f, nod_summary: e.target.value }))} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Fee tracker</h2>
          <p className="text-sm text-muted-foreground">Track filing fees, abutter notice costs, etc. — dollars only; no card processing.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lu2-fee-est">Estimated fees (USD)</Label>
              <Input id="lu2-fee-est" inputMode="decimal" value={feeEstimateDollars} onChange={(e) => setFeeEstimateDollars(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lu2-fee-paid">Recorded paid (USD)</Label>
              <Input id="lu2-fee-paid" inputMode="decimal" value={feePaidDollars} onChange={(e) => setFeePaidDollars(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lu2-fee-notes">Fee notes</Label>
              <Textarea id="lu2-fee-notes" rows={2} value={form.fee_notes} onChange={(e) => setForm((f) => ({ ...f, fee_notes: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Related code cases</h2>
          <Textarea value={relatedText} onChange={(e) => setRelatedText(e.target.value)} rows={2} className="font-mono text-xs" />
          {relatedIds.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {relatedIds.map((cid) => (
                <li key={cid}>
                  <Link className="text-primary underline-offset-4 hover:underline" to={`/cases/${cid}`}>
                    Open case
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <LandUseApplicationDocuments
          landUseApplicationId={row.id}
          documents={documents}
          setDocuments={setDocuments}
          readOnly={user?.role === 'superadmin' && !impersonatedMunicipality}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-h-[44px]">
            {saving ? 'Saving…' : 'Save application'}
          </Button>
        </div>
      </form>
    </div>
  );
}

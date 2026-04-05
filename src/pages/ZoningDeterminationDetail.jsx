import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, FileDown, MapPin, ScrollText } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import StatusBadge from '@/components/shared/StatusBadge';
import ZoningDeterminationDocuments from '@/components/zoning/ZoningDeterminationDocuments';
import ZoningInvestigations from '@/components/zoning/ZoningInvestigations';
import DeterminationNotes from '@/components/zoning/DeterminationNotes';

const requestCategories = [
  { value: 'use_compliance', label: 'Use compliance' },
  { value: 'structure_compliance', label: 'Structure compliance' },
  { value: 'nonconforming_status', label: 'Nonconforming status' },
  { value: 'history_review', label: 'History / violations review' },
  { value: 'variance_path', label: 'Variance path' },
  { value: 'special_exception', label: 'Special exception' },
  { value: 'other', label: 'Other' },
];

const statuses = [
  'draft',
  'in_progress',
  'legal_review',
  'issued',
  'superseded',
  'withdrawn',
];

function parseRelatedCaseIds(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ZoningDeterminationDetail() {
  const { id } = useParams();
  const { user, impersonatedMunicipality, municipality } = useAuth();

  const [zd, setZd] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({});
  const [relatedCasesText, setRelatedCasesText] = useState('');
  const [saving, setSaving] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [generatedDocId, setGeneratedDocId] = useState(null);
  const [lastExportFilename, setLastExportFilename] = useState(null);
  const [exportStatus, setExportStatus] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const rows = await base44.entities.ZoningDetermination.filter({ id });
        const row = rows?.[0];
        if (!row) {
          setError('Zoning determination not found');
          setLoading(false);
          return;
        }
        setZd(row);
        setForm({
          status: row.status || 'draft',
          property_address: row.property_address || '',
          parcel_id: row.parcel_id || '',
          map_block_lot: row.map_block_lot || '',
          applicant_name: row.applicant_name || '',
          applicant_contact: row.applicant_contact || '',
          applicant_is_agent: !!row.applicant_is_agent,
          request_category: row.request_category || 'other',
          request_summary: row.request_summary || '',
          zoning_district_recorded: row.zoning_district_recorded || '',
          determination_text: row.determination_text || '',
          legal_basis: row.legal_basis || '',
          conditions: row.conditions || '',
          staff_notes_internal: row.staff_notes_internal || '',
          prepared_by: row.prepared_by || '',
          issued_date: row.issued_date || '',
          effective_date: row.effective_date || '',
        });
        setRelatedCasesText((row.related_case_ids || []).join(', '));

        const internalId = row.id;
        const [doc, inv] = await Promise.all([
          base44.entities.Document.filter({ zoning_determination_id: internalId }),
          base44.entities.Investigation.filter({ zoning_determination_id: internalId }),
        ]);
        setDocuments(doc || []);
        setInvestigations(inv || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSaveOverview(e) {
    e?.preventDefault();
    if (!zd?.id) return;
    setSaving(true);
    try {
      const related_case_ids = parseRelatedCaseIds(relatedCasesText);
      const payload = {
        ...form,
        related_case_ids,
      };
      const updated = await base44.entities.ZoningDetermination.update(zd.id, payload);
      setZd(updated);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePDF() {
    if (!zd?.id) return;
    setExportLoading(true);
    setGeneratedDocId(null);
    setLastExportFilename(null);
    setExportStatus('');
    try {
      const response = await base44.functions.invoke(
        'exportZoningDetermination',
        mergeActingTownPayload(user, impersonatedMunicipality, {
          zoning_determination_id: zd.id,
        })
      );
      const data = response.data || {};
      const document_id = data.document_id;
      if (!document_id) throw new Error('No document ID returned');
      setGeneratedDocId(document_id);
      if (data.filename) setLastExportFilename(data.filename);
      setExportStatus(data.export_route ? `Built via ${data.export_route}.` : 'Packet generated.');
      try {
        const refreshed = await base44.entities.Document.filter({ zoning_determination_id: zd.id });
        setDocuments(refreshed || []);
      } catch (e) {
        console.warn('Could not refresh documents after export:', e);
      }
    } catch (err) {
      console.error(err);
      setExportStatus('');
      alert(`Generation failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!generatedDocId) return;
    setDownloadLoading(true);
    try {
      const response = await base44.functions.invoke(
        'getCourtFilePDF',
        mergeActingTownPayload(user, impersonatedMunicipality, { document_id: generatedDocId })
      );
      const { signed_url, filename } = response.data;
      if (!signed_url) throw new Error('No download URL returned');
      const a = document.createElement('a');
      a.href = signed_url;
      a.download =
        filename ||
        lastExportFilename ||
        `${zd.file_number || 'zoning-determination'}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (error || !zd) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {error || 'Not found'}
        <div className="mt-4">
          <Link to="/zoning-determinations" className="text-primary underline">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          to="/zoning-determinations"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Zoning determinations
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-xl font-bold">{zd.file_number}</h1>
                <StatusBadge status={zd.status} />
                <HelpTip title="Zoning determination file" align="start">
                  <p>
                    This is an <strong>administrative property file</strong> (not an enforcement case). Use <strong>Record</strong> for the
                    formal determination text, legal basis, and dates. <strong>Documents</strong> and <strong>Site reviews</strong> hold
                    exhibits and field notes; <strong>Notes</strong> adds staff commentary to the audit trail.
                  </p>
                  <p>
                    <strong>Export property packet</strong> generates a PDF for the permanent file; <strong>Download last export</strong>{' '}
                    fetches the most recent packet from this session.
                  </p>
                </HelpTip>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {zd.property_address}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={exportLoading}
              onClick={handleGeneratePDF}
            >
              <FileDown className="h-4 w-4" />
              {exportLoading ? 'Building PDF…' : 'Export property packet'}
            </Button>
            <Button
              className="gap-2"
              disabled={!generatedDocId || downloadLoading}
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" />
              {downloadLoading ? 'Downloading…' : 'Download last export'}
            </Button>
          </div>
        </div>
        {exportStatus ? (
          <p className="mt-2 text-xs text-muted-foreground">{exportStatus}</p>
        ) : null}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Record</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="investigations">Site reviews</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <form onSubmit={handleSaveOverview} className="space-y-6 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Request category</Label>
                <Select
                  value={form.request_category}
                  onValueChange={(v) => update('request_category', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {requestCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Property address</Label>
              <Input value={form.property_address} onChange={(e) => update('property_address', e.target.value)} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Parcel ID</Label>
                <Input value={form.parcel_id} onChange={(e) => update('parcel_id', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Map / block / lot</Label>
                <Input value={form.map_block_lot} onChange={(e) => update('map_block_lot', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Applicant / contact name</Label>
                <Input value={form.applicant_name} onChange={(e) => update('applicant_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Applicant phone / email</Label>
                <Input value={form.applicant_contact} onChange={(e) => update('applicant_contact', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="applicant_is_agent"
                checked={!!form.applicant_is_agent}
                onChange={(e) => update('applicant_is_agent', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="applicant_is_agent" className="font-normal">
                Applicant is an agent (not the owner)
              </Label>
            </div>

            <div className="space-y-1">
              <Label>Scope of request / questions asked</Label>
              <Textarea
                rows={4}
                value={form.request_summary}
                onChange={(e) => update('request_summary', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Zoning district (as recorded)</Label>
              <Input
                value={form.zoning_district_recorded}
                onChange={(e) => update('zoning_district_recorded', e.target.value)}
                placeholder="e.g. C-1, R-3"
              />
            </div>

            <div className="space-y-1">
              <Label>Related enforcement case IDs (optional)</Label>
              <Input
                value={relatedCasesText}
                onChange={(e) => setRelatedCasesText(e.target.value)}
                placeholder="Comma-separated case UUIDs"
              />
            </div>

            <div className="space-y-1">
              <Label>Determination (formal text for the file)</Label>
              <Textarea
                rows={8}
                value={form.determination_text}
                onChange={(e) => update('determination_text', e.target.value)}
                placeholder="Written determination…"
              />
            </div>

            <div className="space-y-1">
              <Label>Legal basis (RSA, ordinance, plan)</Label>
              <Textarea
                rows={4}
                value={form.legal_basis}
                onChange={(e) => update('legal_basis', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Conditions / caveats</Label>
              <Textarea rows={3} value={form.conditions} onChange={(e) => update('conditions', e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Staff notes (internal — also in export appendix)</Label>
              <Textarea
                rows={3}
                value={form.staff_notes_internal}
                onChange={(e) => update('staff_notes_internal', e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Prepared by</Label>
                <Input value={form.prepared_by} onChange={(e) => update('prepared_by', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Issued date</Label>
                <Input type="date" value={form.issued_date || ''} onChange={(e) => update('issued_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={form.effective_date || ''}
                  onChange={(e) => update('effective_date', e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save record'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="documents">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
            <ZoningDeterminationDocuments
              zoningDeterminationId={zd.id}
              documents={documents}
              setDocuments={setDocuments}
            />
          </div>
        </TabsContent>

        <TabsContent value="investigations">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
            <ZoningInvestigations
              zoningDeterminationId={zd.id}
              townId={zd.town_id}
              investigations={investigations}
              setInvestigations={setInvestigations}
            />
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
            <DeterminationNotes
              zoningDeterminationId={zd.id}
              fileNumber={zd.file_number}
              townId={zd.town_id || zd.data?.town_id || municipality?.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

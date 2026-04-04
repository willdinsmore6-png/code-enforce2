import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Globe,
  Pencil,
  Trash2,
  Download
} from 'lucide-react';

import StatusBadge from '../components/shared/StatusBadge';
import CaseTimeline from '../components/case/CaseTimeline';
import CaseNotices from '../components/case/CaseNotices';
import CaseDocuments from '../components/case/CaseDocuments';
import EditCaseModal from '../components/case/EditCaseModal';
import CaseNotes from '../components/case/CaseNotes';

import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, impersonatedMunicipality } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [notices, setNotices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [courtActions, setCourtActions] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [generatedDocId, setGeneratedDocId] = useState(null);
  const [lastExportFilename, setLastExportFilename] = useState(null);
  const [exportStatus, setExportStatus] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

  // MAIN LOAD: case + children (using internal UUID for relationships)
  useEffect(() => {
    async function load() {
      try {
        setError(null);

        // Load the case using the URL param (human-readable ID)
        const caseResult = await base44.entities.Case.filter({ id });
        const caseRecord = caseResult[0];

        if (!caseRecord) {
          setError('Case not found');
          setLoading(false);
          return;
        }

        setCaseData(caseRecord);

        // Use the internal UUID for all related entities
        const internalId = caseRecord.id;

        const [inv, not, doc, dl, ca] = await Promise.all([
          base44.entities.Investigation.filter({ case_id: internalId }),
          base44.entities.Notice.filter({ case_id: internalId }),
          base44.entities.Document.filter({ case_id: internalId }),
          base44.entities.Deadline.filter({ case_id: internalId }),
          base44.entities.CourtAction.filter({ case_id: internalId })
        ]);

        setInvestigations(inv || []);
        setNotices(not || []);
        setDocuments(doc || []);
        setDeadlines(dl || []);
        setCourtActions(ca || []);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load case data:', err);
        setError(err.message || 'Failed to load case details');
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // Load users for assignment dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await base44.functions.invoke(
          'getUsers',
          mergeActingTownPayload(user, impersonatedMunicipality, {})
        );
        setUsers(response.data?.users || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }

    loadUsers();
  }, [user, impersonatedMunicipality]);

  async function updateStatus(newStatus) {
    await base44.entities.Case.update(id, { status: newStatus });
    setCaseData(prev => ({ ...prev, status: newStatus }));
  }

  async function updatePath(path) {
    await base44.entities.Case.update(id, {
      compliance_path: path,
      daily_penalty_rate:
        path === 'citation_676_17b'
          ? caseData.is_first_offense
            ? 275
            : 550
          : caseData.daily_penalty_rate
    });
    setCaseData(prev => ({ ...prev, compliance_path: path }));
  }

  async function handleDeleteCase() {
    setDeleting(true);
    await base44.functions.invoke(
      'deleteCaseWithChildren',
      mergeActingTownPayload(user, impersonatedMunicipality, { case_id: id })
    );
    navigate('/cases');
  }

  async function handleGeneratePDF() {
    setExportLoading(true);
    setGeneratedDocId(null);
    setLastExportFilename(null);
    setExportStatus('');

    const payload = mergeActingTownPayload(user, impersonatedMunicipality, {
      case_id: id,
      investigation_ids: (investigations || []).map((inv) => inv.id).filter(Boolean),
    });

    /** Prefer new function name in case the platform still serves old code at `exportCaseCourtFile`. */
    const tryFunctions = ['exportFullCourtPacket', 'exportCaseCourtFile'];
    let lastErr = null;

    try {
      for (const fn of tryFunctions) {
        try {
          const response = await base44.functions.invoke(fn, payload);
          const data = response.data || {};
          const document_id = data.document_id;
          if (!document_id) throw new Error('No document ID returned');
          setGeneratedDocId(document_id);
          if (data.filename) setLastExportFilename(data.filename);
          const route = data.export_route || fn;
          const pv = data.packet_variant ? ` · ${data.packet_variant}` : '';
          setExportStatus(`Built via ${route}${pv}. Check PDF footer for packet id.`);
          try {
            const refreshed = await base44.entities.Document.filter({ case_id: id });
            setDocuments(refreshed || []);
          } catch (e) {
            console.warn('Could not refresh document list after export:', e);
          }
          return;
        } catch (e) {
          lastErr = e;
          console.warn(`Court export: ${fn} failed, trying fallback if any`, e);
        }
      }
      throw lastErr || new Error('All export functions failed');
    } catch (err) {
      console.error('PDF generation failed:', err);
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
        `${caseData.case_number || 'case'}-court-file.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );

  if (error || !caseData)
    return <div className="p-8 text-center">Error loading case.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          to="/cases"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to cases
        </Link>

        <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/50 dark:ring-white/[0.06] sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {caseData.case_number || `Case #${id.slice(0, 8)}`}
            </h2>
            <div className="flex gap-2 mt-2">
              <StatusBadge status={caseData.status} />
              <StatusBadge status={caseData.priority} type="priority" />
            </div>
            <address className="text-muted-foreground flex items-center gap-1.5 not-italic mt-2">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />{' '}
              {caseData.property_address}
            </address>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={exportLoading}
              className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              {exportLoading ? (
                '...'
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}{' '}
              {exportLoading ? 'Generating...' : 'Generate court packet'}
            </Button>

            {generatedDocId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadLoading}
                className="gap-1.5 border-green-200 text-green-600 hover:bg-green-50"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Case
            </Button>

            {!deleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Case
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDeleteCase}
                >
                  {deleting ? 'Deleting...' : 'Confirm'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <Select value={caseData.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Update status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="investigation">Investigation</SelectItem>
                <SelectItem value="notice_sent">Notice Sent</SelectItem>
                <SelectItem value="awaiting_response">
                  Awaiting Response
                </SelectItem>
                <SelectItem value="in_compliance">In Compliance</SelectItem>
                <SelectItem value="citation_issued">Citation Issued</SelectItem>
                <SelectItem value="court_action">Court Action</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            </div>
            {exportStatus ? (
              <p className="text-xs text-muted-foreground text-right max-w-sm leading-snug">
                {exportStatus}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Owner
            </span>
          </div>
          <p className="text-sm font-semibold capitalize">
            {caseData.property_owner_name || '—'}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Violation
            </span>
          </div>
          <p className="text-sm font-semibold capitalize">
            {caseData.violation_type?.replace('_', ' ') || '—'}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Abatement Deadline
            </span>
          </div>
          <p className="text-sm font-semibold capitalize">
            {caseData.abatement_deadline
              ? format(new Date(caseData.abatement_deadline), 'MMM d, yyyy')
              : '—'}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Assigned Officer
            </span>
          </div>
          <div>
            <Select
              value={caseData.assigned_officer || ''}
              onValueChange={async v => {
                await base44.entities.Case.update(id, {
                  assigned_officer: v || null
                });
                setCaseData(prev => ({
                  ...prev,
                  assigned_officer: v || null
                }));
              }}
            >
              <SelectTrigger className="h-auto text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Unassigned —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {caseData.public_access_code && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Public Portal Access Code
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Share this code with the property owner
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-lg font-bold tracking-widest text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
              {caseData.public_access_code}
            </span>
          </div>
        </div>
      )}

      {caseData.compliance_path === 'none' && caseData.status !== 'intake' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">
            Select Compliance Path
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => updatePath('citation_676_17b')}
              className="border-amber-300 hover:bg-amber-100"
            >
              Path A: Land Use Citation (RSA 676:17-b)
            </Button>
            <Button
              variant="outline"
              onClick={() => updatePath('superior_court_676_15')}
              className="border-amber-300 hover:bg-amber-100"
            >
              Path B: Superior Court (RSA 676:15)
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">
            Notices ({notices.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Violation Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {caseData.violation_description}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Deadlines</h3>
            <div className="space-y-2">
              {deadlines.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{d.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.deadline_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {format(new Date(d.due_date), 'MMM d, yyyy')}
                    </p>
                    <StatusBadge status={d.priority} type="priority" />
                  </div>
                </div>
              ))}
              {deadlines.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No deadlines set.
                </p>
              )}
            </div>
          </div>

          <CaseNotes caseId={id} caseNumber={caseData.case_number} />
        </TabsContent>

        <TabsContent value="notices">
          <CaseNotices
            caseId={id}
            caseData={caseData}
            notices={notices}
            setNotices={setNotices}
          />
        </TabsContent>

        <TabsContent value="documents">
          <CaseDocuments
            caseId={id}
            documents={documents}
            setDocuments={setDocuments}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <CaseTimeline
            caseData={caseData}
            investigations={investigations}
            notices={notices}
            courtActions={courtActions}
          />
        </TabsContent>
      </Tabs>

      <EditCaseModal
        caseData={caseData}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={updated => setCaseData(updated)}
      />
    </div>
  );
}

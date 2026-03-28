import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Camera, Scale, Bell, Clock, MapPin, User, AlertTriangle, Copy, Globe, Pencil, Trash2, Download } from 'lucide-react';
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

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [c, inv, not, doc, dl, ca] = await Promise.all([
          base44.entities.Case.filter({ id }),
          base44.entities.Investigation.filter({ case_id: id }),
          base44.entities.Notice.filter({ case_id: id }),
          base44.entities.Document.filter({ case_id: id }),
          base44.entities.Deadline.filter({ case_id: id }),
          base44.entities.CourtAction.filter({ case_id: id }),
        ]);
        setCaseData(c[0] || null);
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

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await base44.functions.invoke('getUsers', {});
        setUsers(response.data?.users || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }
    loadUsers();
  }, []);

  async function updateStatus(newStatus) {
    await base44.entities.Case.update(id, { status: newStatus });
    setCaseData(prev => ({ ...prev, status: newStatus }));
  }

  async function updatePath(path) {
    await base44.entities.Case.update(id, { 
      compliance_path: path,
      daily_penalty_rate: path === 'citation_676_17b' ? (caseData.is_first_offense ? 275 : 550) : caseData.daily_penalty_rate 
    });
    setCaseData(prev => ({ ...prev, compliance_path: path }));
  }

  async function handleDeleteCase() {
    setDeleting(true);
    await base44.functions.invoke('deleteCaseWithChildren', { case_id: id });
    navigate('/cases');
  }

  async function handleExportPDF() {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      const { pdf_base64, filename } = response.data;
      if (!pdf_base64) throw new Error('No PDF data returned');
      const binaryStr = atob(pdf_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${caseData.case_number || 'case'}-court-file.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-medium mb-2">Error loading case</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Link to="/cases" className="text-primary hover:underline text-sm inline-block">Back to cases</Link>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Case not found.</p>
        <Link to="/cases" className="text-primary hover:underline text-sm mt-2 inline-block">Back to cases</Link>
      </div>
    );
  }

  const pathLabels = {
    none: 'Not Selected',
    citation_676_17b: 'Path A: Citation (RSA 676:17-b)',
    superior_court_676_15: 'Path B: Superior Court (RSA 676:15)',
  };

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="sr-only">Case Details</h1>
      {/* Header */}
      <div className="mb-6">
        <Link to="/cases" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to cases
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{caseData.case_number || `Case #${id.slice(0, 8)}`}</h2>
            <div className="flex gap-2 mt-2">
              <StatusBadge status={caseData.status} />
              <StatusBadge status={caseData.priority} type="priority" />
            </div>
            <address className="text-muted-foreground flex items-center gap-1.5 not-italic mt-2">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {caseData.property_address}
            </address>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportLoading} className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50">
              {exportLoading ? <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit Case
            </Button>
            {!deleteConfirm ? (
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(true)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete Case
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteCase}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
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
                <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                <SelectItem value="in_compliance">In Compliance</SelectItem>
                <SelectItem value="citation_issued">Citation Issued</SelectItem>
                <SelectItem value="court_action">Court Action</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard icon={User} label="Owner" value={caseData.property_owner_name || '—'} />
        <InfoCard icon={AlertTriangle} label="Violation" value={caseData.violation_type?.replace('_', ' ') || '—'} />
        <InfoCard icon={Clock} label="Abatement Deadline" value={caseData.abatement_deadline ? format(new Date(caseData.abatement_deadline), 'MMM d, yyyy') : '—'} />
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Assigned Officer</span>
          </div>
          <div>
            <Select value={caseData.assigned_officer || ''} onValueChange={async (v) => {
              await base44.entities.Case.update(id, { assigned_officer: v || null });
              setCaseData(prev => ({ ...prev, assigned_officer: v || null }));
            }}>
              <SelectTrigger className="h-auto text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Unassigned —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.email}>{u.full_name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Public Access Code */}
      {caseData.public_access_code && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Public Portal Access Code</p>
              <p className="text-xs text-blue-600 mt-0.5">Share this code with the property owner so they can check their case status at the Public Portal page</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-lg font-bold tracking-widest text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
              {caseData.public_access_code}
            </span>
            <button
              onClick={() => copyToClipboard(caseData.public_access_code)}
              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
              title="Copy code"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Compliance Path Selector */}
      {caseData.compliance_path === 'none' && caseData.status !== 'intake' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">Select Compliance Path</h3>
          <p className="text-sm text-amber-700 mb-4">Choose the enforcement path for this violation:</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => updatePath('citation_676_17b')} className="border-amber-300 hover:bg-amber-100">
              Path A: Land Use Citation (RSA 676:17-b)
            </Button>
            <Button variant="outline" onClick={() => updatePath('superior_court_676_15')} className="border-amber-300 hover:bg-amber-100">
              Path B: Superior Court (RSA 676:15)
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditCaseModal
        caseData={caseData}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => setCaseData(updated)}
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4" aria-label="Case details tabs">
        <TabsList className="bg-muted/50 p-1" role="tablist">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Violation Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{caseData.violation_description}</p>
            {caseData.specific_code_violated && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">Code Cited: </span>
                <span className="text-sm font-medium">{caseData.specific_code_violated}</span>
              </div>
            )}
          </div>

          {/* Assigned Officer */}
          {caseData.assigned_officer && (
            <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Assigned Officer (receives deadline alerts)</p>
                <p className="text-sm font-medium">{caseData.assigned_officer}</p>
              </div>
            </div>
          )}

          {/* Deadlines */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Deadlines</h3>
            <div className="space-y-2">
              {deadlines.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.description}</p>
                    <p className="text-xs text-muted-foreground">{d.deadline_type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{format(new Date(d.due_date), 'MMM d, yyyy')}</p>
                    <StatusBadge status={d.priority} type="priority" />
                  </div>
                </div>
              ))}
              {deadlines.length === 0 && <p className="text-sm text-muted-foreground">No deadlines set.</p>}
            </div>
          </div>

          {/* Court Actions */}
          {courtActions.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-3">Court Actions</h3>
              <div className="space-y-2">
                {courtActions.map(ca => (
                  <div key={ca.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{ca.action_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{ca.court_type.replace('_', ' ')} • {ca.docket_number || 'No docket #'}</p>
                    </div>
                    <StatusBadge status={ca.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case Notes */}
          <CaseNotes caseId={id} caseNumber={caseData.case_number} />
        </TabsContent>

        <TabsContent value="notices">
          <CaseNotices caseId={id} caseData={caseData} notices={notices} setNotices={setNotices} />
        </TabsContent>

        <TabsContent value="documents">
          <CaseDocuments caseId={id} documents={documents} setDocuments={setDocuments} />
        </TabsContent>

        <TabsContent value="timeline">
          <CaseTimeline caseData={caseData} investigations={investigations} notices={notices} courtActions={courtActions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
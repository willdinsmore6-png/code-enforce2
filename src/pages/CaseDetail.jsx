import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Download, Pencil, Trash2, Loader2, User, AlertTriangle, Clock, Globe, FileText, Camera, Scale, Bell, Copy } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import CaseTimeline from '../components/case/CaseTimeline';
import CaseNotices from '../components/case/CaseNotices';
import CaseDocuments from '../components/case/CaseDocuments';
import EditCaseModal from '../components/case/EditCaseModal';
import CaseNotes from '../components/case/CaseNotes';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  const [downloadLoading, setDownloadLoading] = useState(false);

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
        console.error('Failed to load case:', err);
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
    const penalty = path === 'citation_676_17b' ? (caseData.is_first_offense ? 275 : 550) : caseData.daily_penalty_rate;
    await base44.entities.Case.update(id, { 
      compliance_path: path,
      daily_penalty_rate: penalty 
    });
    setCaseData(prev => ({ ...prev, compliance_path: path, daily_penalty_rate: penalty }));
  }

  async function handleDeleteCase() {
    setDeleting(true);
    await base44.functions.invoke('deleteCaseWithChildren', { case_id: id });
    navigate('/cases');
  }

  async function handleGeneratePDF() {
    setExportLoading(true);
    setGeneratedDocId(null);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      if (response.data.document_id) {
        setGeneratedDocId(response.data.document_id);
        toast({ title: "PDF Generated Successfully" });
      }
    } catch (err) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!generatedDocId) return;
    setDownloadLoading(true);
    try {
      const response = await base44.functions.invoke('getCourtFilePDF', { document_id: generatedDocId });
      if (response.data.signed_url) {
        const a = document.createElement('a');
        a.href = response.data.signed_url;
        a.download = response.data.filename || 'court-file.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      toast({ title: "Download Error", variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (error || !caseData) return <div className="p-8 text-center text-destructive">Error loading case details.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header Section */}
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
            <address className="text-muted-foreground flex items-center gap-1.5 not-italic mt-2 text-sm">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {caseData.property_address}
            </address>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={exportLoading} className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50">
              {exportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exportLoading ? 'Generating...' : 'Generate PDF'}
            </Button>
            {generatedDocId && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadLoading} className="gap-1.5 border-green-200 text-green-600 hover:bg-green-50">
                {downloadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download PDF
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit Case
            </Button>
            <Select value={caseData.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Update status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="investigation">Investigation</SelectItem>
                <SelectItem value="notice_sent">Notice Sent</SelectItem>
                <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                <SelectItem value="in_compliance">In Compliance</SelectItem>
                <SelectItem value="citation_issued">Citation Issued</SelectItem>
                <SelectItem value="court_action">Court Action</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Info Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Owner</span>
            </div>
            <p className="text-sm font-semibold truncate">{caseData.property_owner_name || '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Violation Type</span>
            </div>
            <p className="text-sm font-semibold capitalize">{caseData.violation_type?.replace('_', ' ') || '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Abatement Deadline</span>
            </div>
            <p className="text-sm font-semibold">{caseData.abatement_deadline ? format(new Date(caseData.abatement_deadline), 'MMM d, yyyy') : '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Assigned Officer</span>
          </div>
          <p className="text-sm font-semibold">{caseData.assigned_officer || 'Unassigned'}</p>
        </div>
      </div>

      {/* Public Access Banner */}
      {caseData.public_access_code && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Public Portal Access Code</p>
              <p className="text-xs text-blue-600">Share this code with the property owner for digital compliance tracking.</p>
            </div>
          </div>
          <span className="font-mono text-lg font-bold tracking-widest text-blue-800 bg-white px-3 py-1 rounded-lg border border-blue-100">
            {caseData.public_access_code}
          </span>
        </div>
      )}

      {/* Compliance Path Selector */}
      {caseData.compliance_path === 'none' && caseData.status !== 'intake' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">Select Compliance Path</h3>
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

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Violation Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{caseData.violation_description}</p>
          </div>
          
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold mb-4">Active Deadlines</h3>
            <div className="space-y-3">
              {deadlines.length > 0 ? deadlines.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.description}</p>
                    <p className="text-xs text-muted-foreground uppercase">{d.deadline_type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{format(new Date(d.due_date), 'MMM d, yyyy')}</p>
                    <StatusBadge status={d.priority} type="priority" />
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground italic">No deadlines set for this case.</p>}
            </div>
          </div>
          
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

      <EditCaseModal caseData={caseData} open={editOpen} onClose={() => setEditOpen(false)} onSave={(updated) => setCaseData(updated)} />
      
      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t">
        {!deleteConfirm ? (
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" /> Delete Case Record
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-destructive font-semibold">Confirm permanent deletion?</span>
            <Button variant="destructive" size="sm" onClick={handleDeleteCase} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}

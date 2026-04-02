import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Camera, Scale, Bell, Clock, MapPin, User, AlertTriangle, Copy, Globe, Pencil, Trash2, Download, Loader2 } from 'lucide-react';
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
      const { document_id } = response.data;
      if (!document_id) throw new Error('No document ID returned');
      setGeneratedDocId(document_id);
      toast({ title: "PDF Generated", description: "The certified file is now available for download." });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({ title: "Generation Error", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  }

  // FIXED: Handles secure download of Private PDF files via Signed URL
  async function handleDownloadPDF() {
    if (!generatedDocId) return;
    setDownloadLoading(true);
    try {
      const response = await base44.functions.invoke('getCourtFilePDF', { 
        document_id: generatedDocId 
      });
      
      const { signed_url, filename } = response.data;
      if (!signed_url) throw new Error('Secure access denied');

      const a = document.createElement('a');
      a.href = signed_url;
      a.download = filename || 'certified-court-file.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({ title: "Download Started", description: "Certified record is being saved to your device." });
    } catch (err) {
      console.error('Download error:', err);
      toast({ title: "Download Failed", description: "Unable to retrieve private file.", variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin" /></div>;
  if (error || !caseData) return <div className="p-8 text-center">Error loading case details.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
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
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Select value={caseData.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Update status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="investigation">Investigation</SelectItem>
                <SelectItem value="notice_sent">Notice Sent</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">Owner</span>
            <p className="text-sm font-semibold">{caseData.property_owner_name || '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">Violation</span>
            <p className="text-sm font-semibold capitalize">{caseData.violation_type?.replace('_', ' ') || '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">Deadline</span>
            <p className="text-sm font-semibold">{caseData.abatement_deadline ? format(new Date(caseData.abatement_deadline), 'MMM d, yyyy') : '—'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <span className="text-xs font-medium text-muted-foreground block mb-1">Assigned Officer</span>
          <p className="text-sm font-semibold">{caseData.assigned_officer || 'Unassigned'}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
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
    </div>
  );
}

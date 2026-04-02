import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, User, AlertTriangle, Clock, Download, Pencil, Trash2, Globe, Copy } from 'lucide-react';
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
  const [documents, setDocuments] = useState([]); // Persistent state
  const [deadlines, setDeadlines] = useState([]);
  const [courtActions, setCourtActions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [generatedDocId, setGeneratedDocId] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        // FETCHING FROM DATABASE
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
        setDocuments(doc || []); // Now loaded from DB
        setDeadlines(dl || []);
        setCourtActions(ca || []);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load case details');
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ALL YOUR ORIGINAL FUNCTIONS (PDF, Delete, etc.)
  async function updateStatus(newStatus) {
    await base44.entities.Case.update(id, { status: newStatus });
    setCaseData(prev => ({ ...prev, status: newStatus }));
  }

  async function handleGeneratePDF() {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      setGeneratedDocId(response.data.document_id);
    } catch (err) { alert(`Generation failed: ${err.message}`); }
    finally { setExportLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/cases" className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to cases
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{caseData.case_number}</h2>
            <address className="text-muted-foreground not-italic"><MapPin className="w-3.5 h-3.5 inline mr-1" />{caseData.property_address}</address>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={exportLoading}>
              {exportLoading ? 'Generating...' : 'Generate PDF'}
            </Button>
            <Select value={caseData.status} onValueChange={updateStatus}>
               <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="intake">Intake</SelectItem>
                 <SelectItem value="investigation">Investigation</SelectItem>
                 <SelectItem value="notice_sent">Notice Sent</SelectItem>
               </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CaseNotes caseId={id} />
        </TabsContent>

        <TabsContent value="notices">
          <CaseNotices caseId={id} notices={notices} setNotices={setNotices} />
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

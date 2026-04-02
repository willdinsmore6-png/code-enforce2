import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Download, Pencil, Trash2, Loader2, User, AlertTriangle, Clock, MessageSquare, Bell, FileText, Globe } from 'lucide-react';
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
  const [exportLoading, setExportLoading] = useState(false);
  const [generatedDocId, setGeneratedDocId] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
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
        setLoading(false); 
      }
    }
    load();
  }, [id]);

  async function handleGeneratePDF() {
    setExportLoading(true);
    setGeneratedDocId(null);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      console.log('PDF Export Response:', response.data);
      
      if (response.data?.document_id) {
        setGeneratedDocId(response.data.document_id);
        toast({ title: "PDF Ready", description: "Document record created successfully." });
      } else {
        throw new Error(response.data?.error || "Failed to create document record.");
      }
    } catch (err) { 
      console.error('PDF Generation Error:', err);
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
        window.open(response.data.signed_url, '_blank');
      }
    } catch (err) { 
      toast({ title: "Download Error", description: "Failed to fetch signed URL.", variant: "destructive" }); 
    } finally { 
      setDownloadLoading(false); 
    }
  }

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
  if (!caseData) return <div className="p-20 text-center font-semibold text-muted-foreground">Case not found.</div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <Link to="/cases" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
          <h2 className="text-2xl font-bold">{caseData.case_number}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {caseData.property_address}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={exportLoading}>
            {exportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <FileText className="w-3.5 h-3.5 mr-2" />}
            Generate PDF
          </Button>
          {generatedDocId && (
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadLoading} className="border-blue-200 text-blue-600">
              Download PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</Button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border p-4 rounded-xl shadow-sm"><span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Status</span><StatusBadge status={caseData.status} /></div>
        <div className="bg-card border p-4 rounded-xl shadow-sm"><span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Owner</span><p className="text-sm font-semibold truncate">{caseData.property_owner_name}</p></div>
        <div className="bg-card border p-4 rounded-xl shadow-sm"><span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Abatement</span><p className="text-sm font-semibold">{caseData.abatement_deadline || 'None'}</p></div>
        <div className="bg-card border p-4 rounded-xl shadow-sm"><span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Officer</span><p className="text-sm font-semibold">{caseData.assigned_officer || 'Unassigned'}</p></div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2"><MessageSquare className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="notices" className="gap-2"><Bell className="w-3.5 h-3.5" /> Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-3.5 h-3.5" /> Vault ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="w-3.5 h-3.5" /> Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
            <div className="bg-card border p-5 rounded-xl mb-6 shadow-sm">
                <h3 className="font-bold text-sm mb-2 uppercase text-slate-400">Violation Description</h3>
                <p className="text-sm leading-relaxed">{caseData.violation_description}</p>
            </div>
            {/* Added correct props to ensure notes work */}
            <CaseNotes caseId={id} caseNumber={caseData?.case_number} />
        </TabsContent>
        <TabsContent value="notices" className="mt-6"><CaseNotices caseId={id} notices={notices} /></TabsContent>
        <TabsContent value="documents" className="mt-6"><CaseDocuments caseId={id} documents={documents} /></TabsContent>
        <TabsContent value="timeline" className="mt-6"><CaseTimeline investigations={investigations} notices={notices} /></TabsContent>
      </Tabs>

      <EditCaseModal caseData={caseData} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

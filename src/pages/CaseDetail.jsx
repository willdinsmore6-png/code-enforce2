import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Download, Pencil, Trash2, Loader2, User, AlertTriangle, Clock, MessageSquare, Bell, FileText } from 'lucide-react';
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

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await base44.functions.invoke('getUsers', {});
        setUsers(response.data?.users || []);
      } catch (e) { 
        console.error(e); 
      }
    }
    loadUsers();
  }, []);

  async function updateStatus(newStatus) {
    await base44.entities.Case.update(id, { status: newStatus });
    setCaseData(prev => ({ ...prev, status: newStatus }));
    toast({ title: "Status Updated" });
  }

  async function updateOfficer(officerName) {
    await base44.entities.Case.update(id, { assigned_officer: officerName });
    setCaseData(prev => ({ ...prev, assigned_officer: officerName }));
    toast({ title: "Officer Assigned" });
  }

  async function handleGeneratePDF() {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      setGeneratedDocId(response.data.document_id);
      toast({ title: "PDF Ready" });
    } catch (err) { 
      toast({ title: "Error", variant: "destructive" }); 
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
      toast({ title: "Download Error", variant: "destructive" }); 
    } finally { 
      setDownloadLoading(false); 
    }
  }

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-20 text-center font-semibold text-muted-foreground">
        Case record not found.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/cases" className="text-xs text-muted-foreground flex items-center gap-1 mb-2 hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Cases
          </Link>
          <h2 className="text-2xl font-bold">
            {caseData.case_number || 'Case Details'}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" /> 
            {caseData.property_address}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={exportLoading}>
            {exportLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
            ) : (
              <FileText className="w-3.5 h-3.5 mr-2" />
            )}
            {exportLoading ? 'Generating...' : 'Generate PDF'}
          </Button>
          
          {generatedDocId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPDF} 
              disabled={downloadLoading} 
              className="border-blue-200 text-blue-600 bg-blue-50/50"
            >
              {downloadLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-2" />
              )}
              Download PDF
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Status</span>
          <StatusBadge status={caseData.status} />
        </div>
        <div className="bg-card border p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Owner</span>
          <p className="text-sm font-semibold truncate">{caseData.property_owner_name || '—'}</p>
        </div>
        <div className="bg-card border p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Deadline</span>
          <p className="text-sm font-semibold">
            {caseData.abatement_deadline ? format(new Date(caseData.abatement_deadline), 'MMM d, yyyy') : 'None'}
          </p>
        </div>
        <div className="bg-card border p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Assigned Officer</span>
          <Select value={caseData.assigned_officer || 'unassigned'} onValueChange={updateOfficer}>
            <SelectTrigger className="h-7 border-none bg-transparent p-0 text-sm font-semibold shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2"><MessageSquare className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="notices" className="gap-2"><Bell className="w-3.5 h-3.5" /> Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-3.5 h-3.5" /> Vault ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="w-3.5 h-3.5" /> Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="bg-card border p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-sm mb-3 uppercase text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Violation Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {caseData.violation_description || 'No description provided.'}
            </p>
          </div>
          <CaseNotes caseId={id} caseNumber={caseData.case_number} />
        </TabsContent>

        <TabsContent value="notices" className="mt-6">
          <CaseNotices caseId={id} notices={notices} setNotices={setNotices} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <CaseDocuments caseId={id} documents={documents} setDocuments={setDocuments} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <CaseTimeline investigations={investigations} notices={notices} />
        </TabsContent>
      </Tabs>

      <EditCaseModal 
        caseData={caseData} 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        onSave={(updated) => setCaseData(updated)} 
      />
    </div>
  );
}

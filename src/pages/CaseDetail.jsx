import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  FileText, 
  Camera, 
  Scale, 
  Bell, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  Copy, 
  Globe, 
  Pencil, 
  Trash2, 
  Download,
  Gavel,
  ShieldCheck,
  History,
  ChevronRight,
  ExternalLink,
  Loader2
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

  async function updatePath(path) {
    const dailyRate = path === 'citation_676_17b' ? (caseData.is_first_offense ? 275 : 550) : 0;
    await base44.entities.Case.update(id, { 
      compliance_path: path,
      daily_penalty_rate: dailyRate 
    });
    setCaseData(prev => ({ ...prev, compliance_path: path, daily_penalty_rate: dailyRate }));
  }

  async function handleGeneratePDF() {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportCaseCourtFile', { case_id: id });
      setGeneratedDocId(response.data.document_id);
    } catch (err) { alert(`Generation failed: ${err.message}`); }
    setExportLoading(false);
  }

  async function handleDownloadPDF() {
    if (!generatedDocId) return;
    setDownloadLoading(true);
    try {
      const response = await base44.functions.invoke('getCourtFilePDF', { document_id: generatedDocId });
      window.open(response.data.signed_url, '_blank');
    } catch (err) { alert(`Download failed: ${err.message}`); }
    setDownloadLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  const pathLabels = {
    none: 'Not Selected',
    citation_676_17b: 'Path A: Citation (RSA 676:17-b)',
    superior_court_676_15: 'Path B: Superior Court (RSA 676:15)',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/cases" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Registry
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight">{caseData.case_number || `CASE-${id.slice(0, 5).toUpperCase()}`}</h2>
            <StatusBadge status={caseData.status} className="scale-110 shadow-sm" />
          </div>
          <p className="text-muted-foreground flex items-center gap-2 mt-2 font-medium">
            <MapPin className="w-4 h-4 text-primary" /> {caseData.property_address}
          </p>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
                <Pencil className="w-4 h-4" /> Edit
            </Button>
            <Button onClick={handleGeneratePDF} disabled={exportLoading} className="gap-2 shadow-lg shadow-primary/20">
                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                Export Court File
            </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content: Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="overview" className="rounded-lg px-6">Overview</TabsTrigger>
              <TabsTrigger value="notices" className="rounded-lg px-6">Notices</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg px-6">Smart Vault</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg px-6">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 outline-none">
              <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Core Violation Facts
                </h3>
                <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Property Owner</p>
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                <User className="w-4 h-4 text-primary" /> {caseData.property_owner_name || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Violation Type</p>
                            <p className="font-bold text-slate-800 bg-muted px-2 py-1 rounded inline-block text-sm uppercase">
                                {caseData.violation_type?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Compliance Path</p>
                            <Select value={caseData.compliance_path || 'none'} onValueChange={updatePath}>
                                <SelectTrigger className="h-9 font-bold border-primary/20 bg-primary/5 text-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select Path...</SelectItem>
                                    <SelectItem value="citation_676_17b">Path A: Citation (RSA 676:17-b)</SelectItem>
                                    <SelectItem value="superior_court_676_15">Path B: Superior Court (RSA 676:15)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {caseData.daily_penalty_rate > 0 && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-800 uppercase">Penalty Accrual</span>
                                <span className="text-sm font-black text-amber-900">${caseData.daily_penalty_rate}/day</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
              <CaseNotes caseId={id} />
            </TabsContent>

            <TabsContent value="notices" className="outline-none">
              <CaseNotices caseId={id} />
            </TabsContent>

            <TabsContent value="documents" className="outline-none">
              <CaseDocuments caseId={id} municipalityId={caseData.town_id} userEmail={users.find(u => u.id === caseData.assigned_to)?.email} />
            </TabsContent>

            <TabsContent value="timeline" className="outline-none">
              <CaseTimeline caseId={id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: Status Controls */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Lifecycle Control
            </h3>
            <div className="space-y-4 relative z-10">
                <div>
                    <Label className="text-[10px] uppercase font-black text-white/40 mb-2 block">Current Status</Label>
                    <Select value={caseData.status} onValueChange={updateStatus}>
                        <SelectTrigger className="bg-white/10 border-white/10 text-white h-11 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {['intake', 'investigation', 'notice_sent', 'awaiting_response', 'citation_issued', 'court_action', 'resolved', 'closed'].map(s => (
                                <SelectItem key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-bold text-white/40 leading-relaxed italic">
                        Updating status will trigger an audit log entry. Ensure all evidence is filed before moving to 'Court Action'.
                    </p>
                </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Urgent Deadlines</h3>
            <div className="space-y-3">
                {deadlines.length > 0 ? deadlines.slice(0, 3).map(d => (
                    <div key={d.id} className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{d.description}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(d.due_date), 'MMM d, yyyy')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                )) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No active deadlines.</p>
                )}
                <Link to="/deadlines">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest mt-2 hover:bg-primary/5">
                        Manage All Deadlines
                    </Button>
                </Link>
            </div>
          </div>
        </div>
      </div>

      <EditCaseModal open={editOpen} onOpenChange={setEditOpen} caseData={caseData} onSave={setCaseData} />
    </div>
  );
}

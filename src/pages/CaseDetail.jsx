import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Download, Pencil, Trash2, Loader2, User, AlertTriangle, Clock, MessageSquare, Bell, FileText, Scale, Globe } from 'lucide-react';
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

  async function updatePath(path) {
    const penalty = path === 'citation_676_17b' ? (caseData?.is_first_offense ? 275 : 550) : caseData?.daily_penalty_rate;
    await base44.entities.Case.update(id, { compliance_path: path, daily_penalty_rate: penalty });
    setCaseData(prev => ({ ...prev, compliance_path: path, daily_penalty_rate: penalty }));
    toast({ title: "Compliance Path Updated" });
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
      toast({ title: "Download Error", variant: "destructive

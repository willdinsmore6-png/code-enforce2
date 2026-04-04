import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Search, FolderOpen, FileText, Image, Download, Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function DocumentVault() {
  const { user, municipality } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      // FIX: Identify the active town context
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;

      try {
        setLoading(true);
        // FIX: Use filter instead of list to enforce town boundaries for SuperAdmins
        const [docs, c] = await Promise.all([
          base44.entities.Document.filter({ town_id: activeTownId }),
          base44.entities.Case.filter({ town_id: activeTownId }),
        ]);
        setDocuments(docs || []);
        setCases(c || []);
      } catch (err) {
        console.error("Vault load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [municipality, user]);

  const handleDownload = (doc) => {
    const targetUrl = doc.file_url || doc.url;
    if (!targetUrl) {
      toast({
        title: "Download Unavailable",
        description: "The file path for this record is missing.",
        variant: "destructive"
      });
      return;
    }

    const link = document.createElement('a');
    link.href = targetUrl;
    link.setAttribute('download', doc.title || 'document');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NEW: Delete function with safety warning for case-linked files
  const handleDelete = async (doc) => {
    const linkedCase = cases.find(c => c.id === doc.case_id);
    const address = linkedCase?.property_address || 'Unlinked';
    
    const confirmDelete = window.confirm(
      `WARNING: DATA DELETION\n\nYou are about to permanently delete "${doc.title}".\n\nThis document is a critical part of the record for: ${address}.\n\nDeleting this will remove it from the Case File history permanently. Do you wish to proceed?`
    );

    if (!confirmDelete) return;

    try {
      await base44.entities.Document.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({
        title: "Document Removed",
        description: "The record has been purged from the vault."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive"
      });
    }
  };

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  const typeLabels = {
    complaint: 'Complaint', nov: 'NOV', photo: 'Photo', court_filing: 'Court Filing',
    correspondence: 'Correspondence', warrant: 'Warrant', abatement_proof: 'Abatement Proof',
    citation: 'Citation', attorney_notes: 'Attorney Notes', other: 'Other', ordinance: 'Ordinance', plan_review: 'Plan Review'
  };

  const filtered = documents.filter(doc => {
    const linkedCase = caseMap[doc.case_id];
    const matchesSearch = !searchTerm ||
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      linkedCase?.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      linkedCase?.case_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const grouped = {};
  filtered.forEach(doc => {
    const linkedCase = caseMap[doc.case_id];
    const key = linkedCase?.property_address || 'Town References / Unlinked';
    if (!grouped[key]) grouped[key] = { caseData: linkedCase, docs: [] };
    grouped[key].docs.push(doc);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Opening Vault...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Document Vault" 
        description={`Archive for ${municipality?.town_name || 'Active Town'}. Indexed by property and case number.`} 
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vault by address or case number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white">
            <SelectValue placeholder="All Document Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Document Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([address, { caseData: linkedCase, docs }]) => (
          <div key={address} className="bg-card rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <FolderOpen className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{address}</p>
                  {linkedCase && (
                    <Link to={`/cases/${linkedCase.id}`} className="text-[10px] font-mono text-blue-600 uppercase tracking-tight hover:underline">
                      Record: {linkedCase.case_number}
                    </Link>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-100">
                {docs.length} Items
              </span>
            </div>
            
            <div className="divide-y divide-slate-50">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                    {doc.document_type === 'photo' ? (
                      <Image className="w-5 h-5 text-slate-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-700 truncate">{doc.title || 'Untitled Document'}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                      {typeLabels[doc.document_type] || 'Standard'} 
                      {doc.created_date && ` • Added ${format(new Date(doc.created_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Download File"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">No matching records in vault</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Search, FolderOpen, FileText, Image, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function DocumentVault() {
  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [docs, c] = await Promise.all([
          base44.entities.Document.list('-created_date', 200),
          base44.entities.Case.list('-created_date', 200),
        ]);
        setDocuments(docs);
        setCases(c);
      } catch (err) {
        console.error("Vault load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDownload = (doc) => {
    // FIX: Base44 Document entity uses 'url', not 'file_url'
    const targetUrl = doc.url || doc.file_url;

    if (!targetUrl) {
      toast({
        title: "Download Unavailable",
        description: "The file path for this record is missing or invalid.",
        variant: "destructive"
      });
      return;
    }

    // Force browser download behavior
    const link = document.createElement('a');
    link.href = targetUrl;
    link.setAttribute('download', doc.title || 'document');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        description="Municipal archive indexed by property and case number." 
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

                  <button 
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Download File"
                  >
                    <Download className="w-5 h-5" />
                  </button>
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

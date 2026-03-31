import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Search, FolderOpen, FileText, Image, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

export default function DocumentVault() {
  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const [docs, c] = await Promise.all([
        base44.entities.Document.list('-created_date', 100),
        base44.entities.Case.list('-created_date', 100),
      ]);
      setDocuments(docs);
      setCases(c);
      setLoading(false);
    }
    load();
  }, []);

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  const typeLabels = {
    complaint: 'Complaint', nov: 'NOV', photo: 'Photo', court_filing: 'Court Filing',
    correspondence: 'Correspondence', warrant: 'Warrant', abatement_proof: 'Abatement Proof',
    citation: 'Citation', attorney_notes: 'Attorney Notes', other: 'Other',
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

  // Group by property address
  const grouped = {};
  filtered.forEach(doc => {
    const linkedCase = caseMap[doc.case_id];
    const key = linkedCase?.property_address || 'Unlinked';
    if (!grouped[key]) grouped[key] = { caseData: linkedCase, docs: [] };
    grouped[key].docs.push(doc);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader title="Document Vault" description="All documents indexed by property address" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, address, or case #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([address, { caseData: linkedCase, docs }]) => (
          <div key={address} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">{address}</p>
                {linkedCase && (
                  <Link to={`/cases/${linkedCase.id}`} className="text-xs text-primary hover:underline">
                    {linkedCase.case_number}
                  </Link>
                )}
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-border">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {doc.document_type === 'photo' ? <Image className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[doc.document_type]} • v{doc.version}
                      {doc.created_date && ` • ${format(new Date(doc.created_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
            No documents found.
          </div>
        )}
      </div>
    </div>
  );
}

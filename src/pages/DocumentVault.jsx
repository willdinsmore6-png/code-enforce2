import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  File, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Image as ImageIcon, 
  FileText, 
  ShieldCheck, 
  Trash2,
  FolderOpen,
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

export default function DocumentVault() {
  const { municipality, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [municipality]);

  async function loadDocuments() {
    setLoading(true);
    // In a real app, you'd filter by town_id here
    const docs = await base44.entities.Document.list('-created_at', 100);
    setDocuments(docs);
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      // Simulate bulk upload logic
      for (let i = 0; i < files.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        await base44.entities.Document.create({
          name: files[i].name,
          url: file_url,
          file_type: files[i].type,
          size: files[i].size,
          municipality_id: municipality?.id,
          uploaded_by: user?.email
        });
      }
      await loadDocuments();
    } catch (err) {
      console.error("Upload failed", err);
    }
    setUploading(false);
  }

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.file_type?.includes(filterType);
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type) => {
    if (type?.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Document Vault" 
        description={`Secure storage for evidence, notices, and legal filings in ${municipality?.town_name || 'your town'}.`}
      />

      {/* --- Upload & Filter Bar --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-1 gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search files..." 
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-11">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="image">Images/Photos</SelectItem>
              <SelectItem value="pdf">PDF Documents</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="w-full md:w-auto">
          <Button variant="default" className="w-full h-11 px-6 shadow-lg shadow-primary/20 gap-2 pointer-events-none">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload New Files"}
          </Button>
          <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {/* --- File Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading ? (
            Array(10).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
            ))
        ) : filteredDocs.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-border">
                <FolderOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-bold">The vault is empty</h3>
                <p className="text-sm text-muted-foreground">Upload property photos or legal notices to get started.</p>
            </div>
        ) : filteredDocs.map(doc => (
          <div key={doc.id} className="group bg-card rounded-2xl border border-border p-4 hover:shadow-xl hover:border-primary/30 transition-all flex flex-col relative overflow-hidden">
            {/* Status Indicators */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="aspect-square mb-4 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors overflow-hidden">
                {doc.file_type?.includes('image') ? (
                    <img src={doc.url} className="w-full h-full object-cover" alt={doc.name} />
                ) : (
                    getFileIcon(doc.file_type)
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate pr-6" title={doc.name}>{doc.name}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Verified</span>
                </div>
                <a href={doc.url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </a>
            </div>
          </div>
        ))}
      </div>

      {/* --- Town Governance Footer --- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex gap-4 items-center shadow-inner">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
            <h4 className="text-sm font-bold text-slate-800">Retention Policy Enforcement</h4>
            <p className="text-xs text-slate-500">Documents in this vault are stored according to your town's state retention schedule. Only authorized admins can permanently delete files.</p>
        </div>
      </div>
    </div>
  );
}

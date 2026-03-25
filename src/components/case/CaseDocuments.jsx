import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Image, Download, Trash2, Eye, Upload, Camera, X } from 'lucide-react';
import DocumentPreview from './DocumentPreview';
import { format } from 'date-fns';

const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.heif';

const typeIcons = {
  complaint: FileText, nov: FileText, photo: Image, court_filing: FileText,
  correspondence: FileText, warrant: FileText, abatement_proof: FileText,
  citation: FileText, attorney_notes: FileText, other: FileText,
};

const typeLabels = {
  complaint: 'Complaint', nov: 'NOV', photo: 'Photo', court_filing: 'Court Filing',
  correspondence: 'Correspondence', warrant: 'Warrant', abatement_proof: 'Abatement Proof',
  citation: 'Citation', attorney_notes: 'Attorney Notes', other: 'Other',
};

export default function CaseDocuments({ caseId, documents, setDocuments, readOnly = false }) {
  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({ title: '', document_type: 'complaint', description: '' });
  const browseRef = useRef(null);
  const cameraRef = useRef(null);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  function addFiles(newFiles) {
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
    if (!form.title && arr[0]) setForm(p => ({ ...p, title: arr[0].name.replace(/\.[^.]+$/, '') }));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) addFiles(dropped);
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, j) => j !== i));
  }

  async function handleDelete(docId) {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    await base44.entities.Document.delete(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length) return;
    setSaving(true);
    for (const f of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      const title = form.title || f.name.replace(/\.[^.]+$/, '');
      const doc = await base44.entities.Document.create({
        ...form,
        title,
        case_id: caseId,
        file_url,
        version: 1,
      });
      setDocuments(prev => [...prev, doc]);
    }
    setOpen(false);
    setSaving(false);
    setFiles([]);
    setForm({ title: '', document_type: 'complaint', description: '' });
  }

  return (
    <div className="space-y-4">
      <DocumentPreview document={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} />
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Document Vault</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Upload</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Auto-filled from filename" />
              </div>
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => update('document_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="nov">Notice of Violation</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="court_filing">Court Filing</SelectItem>
                    <SelectItem value="correspondence">Correspondence</SelectItem>
                    <SelectItem value="warrant">Warrant</SelectItem>
                    <SelectItem value="abatement_proof">Abatement Proof</SelectItem>
                    <SelectItem value="citation">Citation</SelectItem>
                    <SelectItem value="attorney_notes">Attorney Notes</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => update('description', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>File(s) *</Label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Drag & drop files here</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">Images, PDFs, Word, Excel and more</p>
                  <div className="flex justify-center gap-2">
                    <button type="button" onClick={() => browseRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Browse Files
                    </button>
                    <button type="button" onClick={() => cameraRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      <Camera className="w-3.5 h-3.5" /> Take Photo
                    </button>
                  </div>
                  <input ref={browseRef} type="file" multiple accept={ACCEPT} className="hidden"
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative">
                        {f.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-1">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[9px] text-muted-foreground truncate w-14 text-center px-1">{f.name}</span>
                          </div>
                        )}
                        <button type="button" onClick={() => removeFile(i)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !files.length}>
                  {saving ? 'Uploading...' : `Upload${files.length > 1 ? ` (${files.length})` : ''}`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {documents.map(doc => {
          const Icon = typeIcons[doc.document_type] || FileText;
          return (
            <div key={doc.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[doc.document_type]} • v{doc.version}</p>
                {doc.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>}
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {doc.file_url && (
                  <button onClick={() => setPreviewDoc(doc)} className="text-muted-foreground hover:text-primary transition-colors" title="Preview">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                )}
                {!readOnly && (
                  <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {documents.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground bg-card rounded-xl border border-border">
          No documents uploaded yet.
        </div>
      )}
    </div>
  );
}
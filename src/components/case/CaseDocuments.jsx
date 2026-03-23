import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Image, Download, Trash2, Eye } from 'lucide-react';
import DocumentPreview from './DocumentPreview';
import { format } from 'date-fns';

export default function CaseDocuments({ caseId, documents, setDocuments, readOnly = false }) {
  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    document_type: 'complaint',
    description: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleDelete(docId) {
    await base44.entities.Document.delete(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const doc = await base44.entities.Document.create({
      ...form,
      case_id: caseId,
      file_url,
      version: 1,
    });
    setDocuments(prev => [...prev, doc]);
    setOpen(false);
    setSaving(false);
    setFile(null);
    setForm({ title: '', document_type: 'complaint', description: '' });
  }

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
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} required />
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
                <Label>File *</Label>
                <Input type="file" onChange={e => setFile(e.target.files[0])} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</Button>
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
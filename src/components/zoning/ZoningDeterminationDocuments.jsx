import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Image, Download, Trash2, Eye, Upload, X } from 'lucide-react';
import DocumentPreview from '@/components/case/DocumentPreview';
import { isLikelyPublicFileUrl, getDocumentSignedUrl } from '@/lib/documentFileAccess';

const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.heif';

const typeIcons = {
  correspondence: FileText,
  photo: Image,
  zoning_determination: FileText,
  complaint: FileText,
  other: FileText,
};

const typeLabels = {
  correspondence: 'Correspondence',
  photo: 'Photo / exhibit',
  zoning_determination: 'Determination / signed letter',
  complaint: 'Application / intake',
  other: 'Other',
};

export default function ZoningDeterminationDocuments({
  zoningDeterminationId,
  documents,
  setDocuments,
  readOnly = false,
}) {
  const { user, impersonatedMunicipality } = useAuth();
  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    title: '',
    document_type: 'correspondence',
    description: '',
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  function addFiles(newFiles) {
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
    if (!form.title && arr[0]) setForm((p) => ({ ...p, title: arr[0].name.replace(/\.[^.]+$/, '') }));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) addFiles(dropped);
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleDelete(docId) {
    if (!window.confirm('Remove this document from the file?')) return;
    await base44.entities.Document.delete(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleDownloadDocument(doc) {
    try {
      if (isLikelyPublicFileUrl(doc.file_url)) {
        window.open(doc.file_url, '_blank', 'noopener,noreferrer');
        return;
      }
      const { signedUrl, filename } = await getDocumentSignedUrl(user, impersonatedMunicipality, doc.id);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = filename || doc.title || 'document';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Download failed');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length) return;
    const activeTownId = impersonatedMunicipality?.id || user?.town_id;
    if (!activeTownId) {
      alert('No active municipality. Refresh or select a town.');
      return;
    }
    setSaving(true);
    try {
      const newDocs = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        const title = form.title || f.name.replace(/\.[^.]+$/, '');
        const doc = await base44.entities.Document.create({
          title,
          document_type: form.document_type,
          description: form.description || undefined,
          town_id: activeTownId,
          zoning_determination_id: zoningDeterminationId,
          file_url,
          version: 1,
        });
        newDocs.push(doc);
      }
      setDocuments((prev) => [...prev, ...newDocs]);
      setOpen(false);
      setFiles([]);
      setForm({ title: '', document_type: 'correspondence', description: '' });
    } catch (error) {
      console.error(error);
      alert('Upload failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DocumentPreview document={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Documents & exhibits</h3>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.document_type} onValueChange={(v) => update('document_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Files</Label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                        dragging ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent">
                        <Upload className="h-3.5 w-3.5" /> Browse
                        <input
                          type="file"
                          multiple
                          accept={ACCEPT}
                          className="hidden"
                          onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {files.map((f, i) => (
                          <div key={i} className="relative">
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={saving || !files.length}>
                    {saving ? 'Saving…' : 'Upload'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {documents.map((doc) => {
            const Icon = typeIcons[doc.document_type] || FileText;
            return (
              <div key={doc.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabels[doc.document_type] || doc.document_type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(doc)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Image, Download, Trash2, Eye, Upload } from 'lucide-react';
import DocumentPreview from '@/components/case/DocumentPreview';
import { isLikelyPublicFileUrl, getDocumentSignedUrl } from '@/lib/documentFileAccess';

const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.heif';

const typeLabels = {
  application: 'Application / intake',
  plan: 'Plans / surveys',
  abutter_notice: 'Abutter notice',
  hearing: 'Hearing materials',
  nod: 'Notice of decision',
  correspondence: 'Correspondence',
  other: 'Other',
};

export default function LandUseApplicationDocuments({ landUseApplicationId, documents, setDocuments, readOnly = false }) {
  const { user, impersonatedMunicipality } = useAuth();
  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    title: '',
    document_type: 'application',
    description: '',
  });

  function addFiles(newFiles) {
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
    if (!form.title && arr[0]) setForm((p) => ({ ...p, title: arr[0].name.replace(/\.[^.]+$/, '') }));
  }

  async function handleDelete(docId) {
    if (!window.confirm('Remove this document from the application?')) return;
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
      alert('No active municipality.');
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
          land_use_application_id: landUseApplicationId,
          file_url,
          version: 1,
        });
        newDocs.push(doc);
      }
      setDocuments((prev) => [...prev, ...newDocs]);
      setOpen(false);
      setFiles([]);
      setForm({ title: '', document_type: 'application', description: '' });
    } catch (error) {
      console.error(error);
      const hint =
        error?.message?.includes('land_use') || error?.response?.data?.message?.includes('land_use')
          ? '\n\nIn Base44, add an optional field land_use_application_id (text/reference) to the Document entity.'
          : '';
      alert(`Upload failed.${hint}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DocumentPreview document={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Application documents</h3>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lu-doc-type">Type</Label>
                    <Select value={form.document_type} onValueChange={(v) => setForm((p) => ({ ...p, document_type: v }))}>
                      <SelectTrigger id="lu-doc-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lu-doc-title">Title</Label>
                    <Input
                      id="lu-doc-title"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lu-doc-files">Files</Label>
                    <Input id="lu-doc-files" type="file" accept={ACCEPT} multiple onChange={(e) => addFiles(e.target.files)} />
                  </div>
                  <Button type="submit" disabled={saving || !files.length}>
                    {saving ? 'Uploading…' : 'Save'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {documents.length === 0 && <li className="p-4 text-sm text-muted-foreground">No documents yet.</li>}
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {doc.document_type === 'plan' || (doc.title || '').match(/\.(jpg|jpeg|png)$/i) ? (
                  <Image className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{typeLabels[doc.document_type] || doc.document_type}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  View
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument(doc)}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </Button>
                {!readOnly && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

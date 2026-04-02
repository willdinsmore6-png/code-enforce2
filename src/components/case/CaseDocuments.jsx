import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Download, Trash2, Eye, Upload, Camera, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CaseDocuments({ caseId, documents = [], setDocuments }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ title: '', document_type: 'complaint', description: '' });
  const { toast } = useToast();

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length) return;
    setSaving(true);

    try {
      // SECURITY CHECK
      const { data: { user } } = await base44.auth.getUser();
      const uploadedResults = [];

      for (const f of files) {
        // UPLOAD STORAGE
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        
        // SAVE DATABASE
        const doc = await base44.entities.Document.create({
          ...form,
          title: form.title || f.name.replace(/\.[^.]+$/, ''),
          case_id: caseId,
          town_id: user.town_id, // Matches RLS
          file_url,
          uploaded_by: user.email,
          version: 1
        });
        uploadedResults.push(doc);
      }

      setDocuments(prev => [...prev, ...uploadedResults]);
      setOpen(false);
      setFiles([]);
      setForm({ title: '', document_type: 'complaint', description: '' });
      toast({ title: "Success", description: "Documents archived." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to archive files.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Document Vault</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Upload</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Documents</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Filename" />
              </div>
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm({...form, document_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="nov">Notice of Violation</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-2 border-dashed rounded-xl p-8 text-center border-border">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  Browse Files
                  <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={saving || !files.length}>
                {saving ? "Saving to Database..." : "Save to Case"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {documents.map(doc => (
          <div key={doc.id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold truncate max-w-[150px]">{doc.title}</p>
                <p className="text-xs text-muted-foreground uppercase">{doc.document_type}</p>
              </div>
            </div>
            <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded-full">
              <Download className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

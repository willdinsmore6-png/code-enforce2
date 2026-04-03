import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Camera, Upload, Pencil, X, FileText, Trash2, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

// No changes made to PhotoDropZone - preserved original functionality
function PhotoDropZone({ photos, setPhotos }) {
  const [dragging, setDragging] = useState(false);
  function onFileChange(e) {
    setPhotos(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  }
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const files = Array.from(e.dataTransfer.files); if (files.length) setPhotos(prev => [...prev, ...files]); }}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      >
        <Camera className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drag & drop photos or documents here</p>
        <div className="flex justify-center gap-2 mt-3">
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Browse Files
            <input type="file" multiple className="hidden" onChange={onFileChange} />
          </label>
        </div>
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {photos.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg border border-border overflow-hidden">
              <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
              <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// No changes made to Edit Modal - preserved original functionality
function EditInvestigationModal({ inv, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...inv });
  const [saving, setSaving] = useState(false);
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const updated = await base44.entities.Investigation.update(inv.id, form);
    onSave(updated);
    setSaving(false);
    onClose();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Investigation</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <Input value={form.officer_name} onChange={e => setForm({...form, officer_name: e.target.value})} placeholder="Officer Name" />
          <Textarea value={form.field_notes} onChange={e => setForm({...form, field_notes: e.target.value})} placeholder="Field Notes" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Investigations() {
  const { impersonatedMunicipality, user } = useAuth();
  const [investigations, setInvestigations] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [editInv, setEditInv] = useState(null);
  const [form, setForm] = useState({
    case_id: '',
    investigation_date: format(new Date(), 'yyyy-MM-dd'),
    officer_name: '',
    field_notes: '',
  });

  // THE FIX: Improved loading logic to handle SuperAdmin vs Town Admin
  useEffect(() => {
    async function load() {
      setLoading(true);
      const isSuperAdmin = user?.role === 'superadmin';
      const activeTownId = impersonatedMunicipality?.id || user?.town_id;

      try {
        let invData, caseData;
        
        if (isSuperAdmin && !impersonatedMunicipality) {
          // SuperAdmin global view
          invData = await base44.entities.Investigation.list('-created_date', 100);
          caseData = await base44.entities.Case.list('-created_date', 100);
        } else if (activeTownId) {
          // Town-specific view (Impersonated or Normal Admin)
          const filter = { town_id: activeTownId };
          invData = await base44.entities.Investigation.filter(filter, '-created_date', 100);
          caseData = await base44.entities.Case.filter(filter, '-created_date', 100);
        } else {
          invData = [];
          caseData = [];
        }

        setInvestigations(invData || []);
        setCases(caseData || []);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [impersonatedMunicipality, user?.town_id, user?.role]);

  async function handleSubmit(e) {
    e.preventDefault();
    const activeTownId = impersonatedMunicipality?.id || user?.town_id;
    
    if (!activeTownId) {
      alert("Error: No Town ID associated with this session. Investigation cannot be saved.");
      return;
    }

    setSaving(true);
    try {
      const photoUrls = [];
      for (const photo of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
        photoUrls.push(file_url);
      }

      // Explicitly injecting town_id to satisfy RLS security rules
      const inv = await base44.entities.Investigation.create({ 
        ...form, 
        town_id: activeTownId,
        photos: photoUrls 
      });

      setInvestigations(prev => [inv, ...prev]);
      setOpen(false);
      setPhotos([]);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center p-20 animate-pulse">Loading Investigations...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {user?.role === 'superadmin' && !impersonatedMunicipality && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
          <ShieldAlert className="w-4 h-4" />
          <span>Viewing all towns as SuperAdmin. Impersonate a town to filter results.</span>
        </div>
      )}

      {editInv && (
        <EditInvestigationModal
          inv={editInv}
          onClose={() => setEditInv(null)}
          onSave={updated => {
            setInvestigations(prev => prev.map(i => i.id === updated.id ? updated : i));
            setEditInv(null);
          }}
        />
      )}

      <PageHeader
        title="Investigations"
        description="Field records and site notes"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Investigation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Log Investigation</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Case *</Label>
                  <Select value={form.case_id} onValueChange={v => setForm({...form, case_id: v})} required>
                    <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                    <SelectContent>
                      {cases.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.property_address}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={form.officer_name} onChange={e => setForm({...form, officer_name: e.target.value})} placeholder="Officer Name" required />
                <Textarea value={form.field_notes} onChange={e => setForm({...form, field_notes: e.target.value})} placeholder="Notes" required />
                <PhotoDropZone photos={photos} setPhotos={setPhotos} />
                <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Log Investigation"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 mt-6">
        {investigations.map(inv => (
          <div key={inv.id} className="p-5 border rounded-xl bg-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{inv.officer_name}</p>
                <p className="text-xs text-muted-foreground">{inv.investigation_date}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditInv(inv)}><Pencil className="w-4 h-4" /></Button>
            </div>
            <p className="mt-3 text-sm">{inv.field_notes}</p>
          </div>
        ))}
        {investigations.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            No investigations found for this town.
          </div>
        )}
      </div>
    </div>
  );
}

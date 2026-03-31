import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Camera, 
  Upload, 
  Pencil, 
  X, 
  FileText, 
  Trash2, 
  ShieldCheck, 
  MapPin, 
  CloudSun, 
  User, 
  Gavel,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Loader2
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

// --- PHOTO DROP ZONE COMPONENT ---
function PhotoDropZone({ photos, setPhotos }) {
  const [dragging, setDragging] = useState(false);

  function onFileChange(e) {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { 
          e.preventDefault(); 
          setDragging(false); 
          const files = Array.from(e.dataTransfer.files); 
          if (files.length) setPhotos(prev => [...prev, ...files]); 
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          dragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
        }`}
      >
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">Evidence Upload</p>
        <p className="text-xs text-slate-500 mt-1 mb-5">Drag photos or field documents here</p>
        
        <div className="flex justify-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5 text-primary" /> Browse Files
            <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.heic,.heif" className="hidden" onChange={onFileChange} />
          </label>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 animate-in fade-in duration-300">
          {photos.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-1">
                  <FileText className="w-6 h-6 text-slate-300" />
                  <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{f.name}</span>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- EDIT MODAL COMPONENT ---
function EditInvestigationModal({ inv, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...inv });
  const [newPhotos, setNewPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
        const uploadedUrls = [];
        for (const photo of newPhotos) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
          uploadedUrls.push(file_url);
        }
        const updatedPhotos = [...(form.photos || []), ...uploadedUrls];
        const updated = await base44.entities.Investigation.update(inv.id, {
          ...form,
          photos: updatedPhotos,
        });
        onSave({ ...form, photos: updatedPhotos });
        onClose();
    } catch (err) {
        alert("Failed to save changes.");
    } finally {
        setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this investigation record permanently?")) return;
    setDeleting(true);
    await base44.entities.Investigation.delete(inv.id);
    onDelete(inv.id);
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        <div className="bg-slate-900 p-6 text-white">
            <DialogHeader>
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-primary" /> Edit Investigation Entry
                </DialogTitle>
                <p className="text-white/40 text-xs font-medium">Updating log for Case #{inv.case_id?.slice(0,8)}</p>
            </DialogHeader>
        </div>
        
        <form onSubmit={handleSave} className="p-8 space-y-8 bg-white">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investigation Date</Label>
              <Input type="date" value={form.investigation_date} onChange={e => update('investigation_date', e.target.value)} required className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reporting Officer</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input value={form.officer_name} onChange={e => update('officer_name', e.target.value)} required className="h-11 pl-10 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Field Notes</Label>
            <Textarea value={form.field_notes} onChange={e => update('field_notes', e.target.value)} rows={4} required className="rounded-xl border-slate-200" placeholder="Describe your observations..." />
          </div>

          <div className="grid grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!form.violation_confirmed} onCheckedChange={v => update('violation_confirmed', v)} id="edit-vc" />
                  <Label htmlFor="edit-vc" className="text-sm font-bold text-slate-700 cursor-pointer">Violation confirmed</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!form.visible_from_public_row} onCheckedChange={v => update('visible_from_public_row', v)} id="edit-vr" />
                  <Label htmlFor="edit-vr" className="text-sm font-bold text-slate-700 cursor-pointer">Visible from public way</Label>
                </div>
            </div>
            <div className="space-y-3 border-l border-slate-200 pl-6">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!form.warrant_required} onCheckedChange={v => update('warrant_required', v)} id="edit-wr" />
                  <Label htmlFor="edit-wr" className="text-sm font-bold text-slate-700 cursor-pointer">Warrant required</Label>
                </div>
                {form.warrant_required && (
                    <Input 
                        placeholder="Warrant Ref #" 
                        value={form.warrant_reference || ''} 
                        onChange={e => update('warrant_reference', e.target.value)} 
                        className="h-8 text-xs rounded-lg"
                    />
                )}
            </div>
          </div>

          <div className="space-y-4">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidence Documentation</Label>
             <PhotoDropZone photos={newPhotos} setPhotos={setNewPhotos} />
             
             {form.photos?.length > 0 && (
                <div className="pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Current Files ({form.photos.length})</p>
                    <div className="grid grid-cols-6 gap-2">
                        {form.photos.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button 
                                    type="button" 
                                    onClick={() => setForm(p => ({ ...p, photos: p.photos.filter(u => u !== url) }))}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-2 h-2" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
             )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
             <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50 font-bold" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Record
             </Button>
             <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">Cancel</Button>
                <Button type="submit" disabled={saving} className="rounded-xl px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
             </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function Investigations() {
  const { municipality } = useAuth();
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInv, setEditingInv] = useState(null);

  useEffect(() => {
    async function load() {
      if (!municipality?.id) return;
      const data = await base44.entities.Investigation.filter({ town_id: municipality.id }, '-investigation_date', 100);
      setInvestigations(data);
      setLoading(false);
    }
    load();
  }, [municipality]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Investigation Logs" 
        description="Comprehensive field records and evidence documentation."
        actions={
            <div className="flex gap-2 text-xs font-bold bg-slate-100 px-4 py-2 rounded-full border border-slate-200 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {investigations.length} Records Filed
            </div>
        }
      />

      <div className="space-y-6 relative">
        {/* Timeline Path Line */}
        <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-slate-100 hidden sm:block" />

        {investigations.map((inv, idx) => (
          <div key={inv.id} className="relative pl-0 sm:pl-16 group">
            {/* Timeline Circle */}
            <div className="absolute left-[20px] top-6 w-6 h-6 rounded-full bg-white border-4 border-slate-100 z-10 hidden sm:flex items-center justify-center group-hover:border-primary/20 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-primary transition-colors" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/5 p-3 rounded-2xl">
                                <ClipboardCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 leading-tight">Site Visit: {format(new Date(inv.investigation_date), 'MMMM d, yyyy')}</h3>
                                <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-tighter">
                                    <User className="w-3 h-3" /> Reported by {inv.officer_name}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => setEditingInv(inv)}>
                            <Pencil className="w-4 h-4 text-slate-400" />
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Observations & Notes</p>
                                <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">
                                    "{inv.field_notes}"
                                </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-2">
                                {inv.violation_confirmed && (
                                    <span className="bg-red-50 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 border border-red-100">
                                        <ShieldCheck className="w-3 h-3" /> Violation Confirmed
                                    </span>
                                )}
                                {inv.visible_from_public_row && (
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 border border-blue-100">
                                        <Eye className="w-3 h-3" /> Publicly Visible
                                    </span>
                                )}
                                {inv.warrant_required && (
                                    <span className="bg-purple-50 text-purple-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 border border-purple-100">
                                        <Gavel className="w-3 h-3" /> Warrant Utilized
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Site Snapshot</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Conditions</p>
                                    <p className="text-xs font-bold text-slate-700 truncate">{inv.site_conditions || 'Not Logged'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Weather</p>
                                    <p className="text-xs font-bold text-slate-700 truncate">{inv.weather_conditions || 'Clear'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {inv.photos?.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Evidence Gallery ({inv.photos.length})</p>
                            <div className="flex flex-wrap gap-3">
                                {inv.photos.map((url, i) => (
                                    <a key={idx+i} href={url} target="_blank" rel="noreferrer" className="block relative w-16 h-16 rounded-xl overflow-hidden border border-slate-100 hover:border-primary transition-all group">
                                        <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye className="w-4 h-4 text-white" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        ))}

        {investigations.length === 0 && (
            <div className="text-center py-24 bg-card rounded-[40px] border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900">No Field Entries</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                    Create a new investigation log within a specific case file to begin building your evidence history.
                </p>
            </div>
        )}
      </div>

      {editingInv && (
        <EditInvestigationModal 
          inv={editingInv} 
          onClose={() => setEditingInv(null)} 
          onSave={(updated) => setInvestigations(prev => prev.map(i => i.id === updated.id ? updated : i))}
          onDelete={(id) => setInvestigations(prev => prev.filter(i => i.id !== id))}
        />
      )}
    </div>
  );
}

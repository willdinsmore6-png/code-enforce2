import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Camera, Upload, Pencil, X, FileText, Trash2 } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { format } from 'date-fns';

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
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Images (JPG, PNG, HEIC), PDFs, Word docs, and more</p>
        <div className="flex justify-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> Browse Files
          <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.heic,.heif" className="hidden" onChange={onFileChange} />
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
            <Camera className="w-3.5 h-3.5" /> Take Photo
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {photos.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-0.5">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground truncate w-14 text-center px-1">{f.name}</span>
                </div>
              )}
              <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditInvestigationModal({ inv, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...inv });
  const [newPhotos, setNewPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await base44.entities.Investigation.delete(inv.id);
    onDelete(inv.id);
  }
  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const uploadedUrls = [];
    for (const photo of newPhotos) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
      uploadedUrls.push(file_url);
    }
    const updatedPhotos = [...(form.photos || []), ...uploadedUrls];
    const updated = await base44.entities.Investigation.update(inv.id, {
      investigation_date: form.investigation_date,
      officer_name: form.officer_name,
      field_notes: form.field_notes,
      evidence_summary: form.evidence_summary,
      site_conditions: form.site_conditions,
      weather_conditions: form.weather_conditions,
      violation_confirmed: form.violation_confirmed,
      warrant_required: form.warrant_required,
      warrant_reference: form.warrant_reference,
      visible_from_public_row: form.visible_from_public_row,
      photos: updatedPhotos,
    });
    onSave({ ...form, photos: updatedPhotos });
    setSaving(false);
    onClose();
  }

  function removeExistingPhoto(url) {
    setForm(p => ({ ...p, photos: (p.photos || []).filter(u => u !== url) }));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Investigation</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.investigation_date} onChange={e => update('investigation_date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Officer Name *</Label>
              <Input value={form.officer_name} onChange={e => update('officer_name', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Field Notes *</Label>
            <Textarea value={form.field_notes} onChange={e => update('field_notes', e.target.value)} rows={4} required />
          </div>
          <div className="space-y-1.5">
            <Label>Evidence Summary</Label>
            <Textarea value={form.evidence_summary || ''} onChange={e => update('evidence_summary', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Site Conditions</Label>
              <Input value={form.site_conditions || ''} onChange={e => update('site_conditions', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weather</Label>
              <Input value={form.weather_conditions || ''} onChange={e => update('weather_conditions', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={!!form.violation_confirmed} onCheckedChange={v => update('violation_confirmed', v)} id="ec" />
              <Label htmlFor="ec" className="text-sm cursor-pointer">Violation confirmed</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!form.warrant_required} onCheckedChange={v => update('warrant_required', v)} id="ew" />
              <Label htmlFor="ew" className="text-sm cursor-pointer">Warrant required</Label>
            </div>
          </div>
          {form.photos?.length > 0 && (
          <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Existing Photos & Documents</Label>
              <div className="flex flex-wrap gap-2">
                {form.photos.map((url, i) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(url);
                return (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
                      {isImage ? (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-0.5 p-1">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground truncate w-14 text-center">{url.split('/').pop()?.slice(0,15)}</span>
                        </div>
                      )}
                    </a>
                    <button type="button" onClick={() => removeExistingPhoto(url)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Add Photos & Documents</Label>
            <PhotoDropZone photos={newPhotos} setPhotos={setNewPhotos} />
          </div>
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Delete this investigation permanently?</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>No, keep it</Button>
                <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete Investigation
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Investigations() {
  const { impersonatedMunicipality, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromCaseParam = useRef('');
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
    visible_from_public_row: false,
    warrant_required: false,
    warrant_reference: '',
    violation_confirmed: false,
    site_conditions: '',
    weather_conditions: '',
    evidence_summary: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    async function load() {
      // Determine the active town ID based on impersonation OR the user's primary town_id
      const activeTownId = impersonatedMunicipality?.id || user?.town_id;
      const isSuperAdmin = user?.role === 'superadmin';

      if (!activeTownId && !isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        let invData, caseData;
        
        // Logic to allow SuperAdmins to see all data if not impersonating
        if (isSuperAdmin && !impersonatedMunicipality) {
          [invData, caseData] = await Promise.all([
            base44.entities.Investigation.list('-created_date', 100),
            base44.entities.Case.list('-created_date', 100),
          ]);
        } else {
          const townFilter = { town_id: activeTownId };
          [invData, caseData] = await Promise.all([
            base44.entities.Investigation.filter(townFilter, '-created_date', 100),
            base44.entities.Case.filter(townFilter, '-created_date', 100),
          ]);
        }

        setInvestigations((invData || []).filter((inv) => !inv.zoning_determination_id));
        setCases(caseData || []);
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [impersonatedMunicipality, user?.town_id, user?.role]);

  /** Open "Log investigation" from case detail (`/investigations?case=<caseId>`). */
  useEffect(() => {
    const caseIdParam = searchParams.get('case');
    if (!caseIdParam) {
      openedFromCaseParam.current = '';
      return;
    }
    if (!cases.length) return;
    if (openedFromCaseParam.current === caseIdParam) return;
    const exists = cases.some((c) => c.id === caseIdParam);
    if (!exists) {
      const next = new URLSearchParams(searchParams);
      next.delete('case');
      setSearchParams(next, { replace: true });
      return;
    }
    openedFromCaseParam.current = caseIdParam;
    setForm((f) => ({ ...f, case_id: caseIdParam }));
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('case');
    setSearchParams(next, { replace: true });
  }, [cases, searchParams, setSearchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Resolve the town context before saving
    const activeTownId = impersonatedMunicipality?.id || user?.town_id;
    if (!activeTownId) {
      alert("Cannot save investigation: No active town context found.");
      return;
    }

    setSaving(true);
    try {
      const photoUrls = [];
      for (const photo of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
        photoUrls.push(file_url);
      }

      // Explicitly include town_id so RLS rules allow viewing later
      const inv = await base44.entities.Investigation.create({ 
        ...form, 
        town_id: activeTownId, 
        photos: photoUrls 
      });

      setInvestigations(prev => [inv, ...prev]);

      if (form.case_id) {
        await base44.entities.Case.update(form.case_id, {
          status: 'investigation',
          visible_from_public_row: form.visible_from_public_row,
          warrant_required: form.warrant_required,
        });
      }

      setOpen(false);
      setSaving(false);
      setPhotos([]);
      setForm(prev => ({ 
        ...prev, 
        field_notes: '', 
        evidence_summary: '', 
        site_conditions: '', 
        weather_conditions: '',
        visible_from_public_row: false,
        warrant_required: false,
        warrant_reference: '',
        violation_confirmed: false
      }));
    } catch (err) {
      console.error("Save failed:", err);
      setSaving(false);
    }
  }

  const caseMap = {};
  cases.forEach(c => { caseMap[c.id] = c; });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {editInv && (
        <EditInvestigationModal
          inv={editInv}
          onClose={() => setEditInv(null)}
          onSave={updated => {
            setInvestigations(prev => prev.map(i => i.id === updated.id ? updated : i));
            setEditInv(null);
          }}
          onDelete={id => {
            setInvestigations(prev => prev.filter(i => i.id !== id));
            setEditInv(null);
          }}
        />
      )}

      <PageHeader
        title="Investigations"
        description="Field investigations and site inspection records"
        helpTitle="Investigations"
        helpContent={
          <>
            <p>
              Log site visits tied to an <strong>enforcement case</strong>: photos, field notes, warrant flags, and violation confirmation.
              Saving can advance the case toward investigation status.
            </p>
            <p>
              Zoning determination site reviews live on the <strong>Zoning determinations</strong> file, not in this list. Edit an entry from
              the row actions when you need to correct notes or add photos later.
            </p>
          </>
        }
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Investigation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Investigation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Case *</Label>
                    <Select value={form.case_id} onValueChange={v => update('case_id', v)} required>
                      <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                      <SelectContent>
                        {cases.filter(c => !['resolved', 'closed'].includes(c.status)).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.case_number || c.id.slice(0, 8)} — {c.property_address?.slice(0, 30)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date *</Label>
                    <Input type="date" value={form.investigation_date} onChange={e => update('investigation_date', e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Officer Name *</Label>
                  <Input value={form.officer_name} onChange={e => update('officer_name', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Field Notes *</Label>
                  <Textarea value={form.field_notes} onChange={e => update('field_notes', e.target.value)} rows={4} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Evidence Summary</Label>
                  <Textarea value={form.evidence_summary} onChange={e => update('evidence_summary', e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Site Conditions</Label>
                    <Input value={form.site_conditions} onChange={e => update('site_conditions', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weather</Label>
                    <Input value={form.weather_conditions} onChange={e => update('weather_conditions', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.visible_from_public_row} onCheckedChange={v => update('visible_from_public_row', v)} id="row" />
                    <Label htmlFor="row" className="text-sm cursor-pointer">Visible from public right-of-way</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.warrant_required} onCheckedChange={v => update('warrant_required', v)} id="warrant" />
                    <Label htmlFor="warrant" className="text-sm cursor-pointer">Administrative warrant required (RSA 595-B)</Label>
                  </div>
                  {form.warrant_required && (
                    <div className="space-y-1.5 ml-6">
                      <Label>Warrant Reference</Label>
                      <Input value={form.warrant_reference} onChange={e => update('warrant_reference', e.target.value)} placeholder="Warrant # or reference" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.violation_confirmed} onCheckedChange={v => update('violation_confirmed', v)} id="confirmed" />
                    <Label htmlFor="confirmed" className="text-sm cursor-pointer">Violation confirmed</Label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Photos & Documents</Label>
                  <PhotoDropZone photos={photos} setPhotos={setPhotos} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log Investigation'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3">
        {investigations.map(inv => {
          const linkedCase = caseMap[inv.case_id];
          return (
            <div key={inv.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{inv.officer_name}</p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{inv.investigation_date ? format(new Date(inv.investigation_date), 'MMM d, yyyy') : ''}</span>
                      {inv.violation_confirmed && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Violation Confirmed</span>
                      )}
                    </div>
                    <button onClick={() => setEditInv(inv)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10 flex-shrink-0" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  {linkedCase && (
                    <p className="text-xs text-primary mt-0.5">{linkedCase.case_number} — {linkedCase.property_address}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{inv.field_notes}</p>
                  {inv.photos?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto flex-wrap">
                      {inv.photos.map((url, i) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(url);
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={url.split('/').pop()}>
                            {isImage ? (
                              <img src={url} alt={`Investigation attachment ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
                            ) : (
                              <div className="w-20 h-20 rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-1 hover:bg-accent transition-colors">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground truncate w-16 text-center px-1">{url.split('/').pop()?.slice(0,20)}</span>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {investigations.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-xl border border-border">
            No investigations recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

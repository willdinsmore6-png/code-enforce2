import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  Upload, 
  X, 
  AlertTriangle, 
  MapPin, 
  Camera, 
  FileText, 
  Shield, 
  EyeOff, 
  Loader2, 
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const VIOLATION_TYPES = [
  { value: 'junk_debris', label: 'Junk / Debris / Abandoned Vehicles' },
  { value: 'housing_condition', label: 'Housing Condition / Unsafe Structure' },
  { value: 'zoning', label: 'Zoning Violation' },
  { value: 'building_code', label: 'Building Code Violation' },
  { value: 'health_safety', label: 'Health & Safety Hazard' },
  { value: 'signage', label: 'Illegal Signage' },
  { value: 'setback', label: 'Setback Violation' },
  { value: 'use_violation', label: 'Illegal Use of Property' },
  { value: 'junkyard', label: 'Junkyard / Salvage' },
  { value: 'septic', label: 'Septic / Sanitation' },
  { value: 'wetlands', label: 'Wetlands Violation' },
  { value: 'other', label: 'Other' },
];

export default function Report() {
  const [townConfig, setTownConfig] = useState(null);
  const [form, setForm] = useState({
    property_address: '',
    violation_type: '',
    violation_description: '',
    complainant_name: '',
    complainant_contact: '',
    complainant_anonymous: false,
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.entities.TownConfig.list('-created_date', 1).then(configs => {
      if (configs[0]) setTownConfig(configs[0]);
    }).catch(() => {});
  }, []);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  async function handlePhotoAdd(e) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos(prev => [...prev, { url: file_url, name: file.name }]);
    }
    setUploading(false);
  }

  function validate() {
    const e = {};
    if (!form.property_address.trim()) e.property_address = 'Address is required.';
    if (!form.violation_type) e.violation_type = 'Please select a violation category.';
    if (!form.violation_description.trim()) e.violation_description = 'Please describe the issue.';
    if (!form.complainant_anonymous && !form.complainant_name.trim()) {
        e.complainant_name = 'Name is required unless anonymous.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('submitPublicReport', {
        ...form,
        photo_urls: photos.map(p => p.url),
        town_id: townConfig?.id || null,
      });
      setResult(response.data);
    } catch (err) {
      alert("Submission failed. Please try again.");
    }
    setSubmitting(false);
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Report Received</h1>
          <p className="text-slate-500 mb-8 font-medium">Thank you. Your report has been successfully filed with {townConfig?.town_name || 'Town'} Enforcement.</p>

          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 mb-8 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Official Case ID</p>
              <p className="font-mono text-xl font-bold text-slate-800 tracking-tighter">{result.case_number}</p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Public Access Code</p>
              <p className="font-mono text-3xl font-black text-primary bg-primary/5 py-3 rounded-xl border border-primary/10">
                {result.public_access_code}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start text-left p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              <strong>Save this code.</strong> You will need it to track progress, view officer notes, or submit more evidence via the Public Portal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-6 px-6 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
                {townConfig?.logo_url ? <img src={townConfig.logo_url} className="w-10 h-10 object-contain" /> : <Shield className="w-6 h-6 text-slate-400" />}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Report a Violation</h1>
              <p className="text-xs font-bold text-primary uppercase tracking-widest">{townConfig?.town_name || 'Municipal Enforcement'}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100">
             <Shield className="w-3.5 h-3.5" />
             <span className="text-[10px] font-black uppercase tracking-wider">Secure Portal</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-8">
            {/* Section: Location */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-slate-800">Property Location</h2>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Street Address *</Label>
                    <Input 
                        value={form.property_address} 
                        onChange={e => update('property_address', e.target.value)} 
                        placeholder="123 Main St, Town Name, NH"
                        className={`h-12 text-md rounded-xl border-slate-200 focus-visible:ring-primary ${errors.property_address ? 'border-red-500' : ''}`}
                    />
                    {errors.property_address && <p className="text-[10px] font-bold text-red-500">{errors.property_address}</p>}
                </div>
            </div>

            {/* Section: Violation Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-slate-800">Violation Details</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Category *</Label>
                        <Select value={form.violation_type} onValueChange={v => update('violation_type', v)}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                                {VIOLATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {errors.violation_type && <p className="text-[10px] font-bold text-red-500">{errors.violation_type}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Describe the Issue *</Label>
                    <Textarea 
                        value={form.violation_description} 
                        onChange={e => update('violation_description', e.target.value)}
                        placeholder="Please provide details about what you observed..."
                        className={`min-h-[150px] rounded-xl border-slate-200 resize-none ${errors.violation_description ? 'border-red-500' : ''}`}
                    />
                    {errors.violation_description && <p className="text-[10px] font-bold text-red-500">{errors.violation_description}</p>}
                </div>

                {/* Evidence Upload */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Evidence / Photos</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {photos.map((p, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                                <img src={p.url} className="w-full h-full object-cover" />
                                <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center cursor-pointer group">
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Camera className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />}
                            <span className="text-[10px] font-bold text-slate-400 mt-2">Add Photo</span>
                            <input type="file" className="hidden" multiple onChange={handlePhotoAdd} accept="image/*" />
                        </label>
                    </div>
                </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Sidebar: Privacy & Identity */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-primary" /> Privacy Settings
                </h3>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-colors">
                        <Checkbox 
                            id="anonymous" 
                            checked={form.complainant_anonymous} 
                            onCheckedChange={v => update('complainant_anonymous', v)} 
                            className="border-white/20 data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="anonymous" className="text-xs font-bold cursor-pointer">Stay Anonymous</Label>
                    </div>

                    {!form.complainant_anonymous && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40">Your Name</Label>
                                <Input value={form.complainant_name} onChange={e => update('complainant_name', e.target.value)} className="bg-white/10 border-white/10 text-white h-10 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40">Contact Method</Label>
                                <Input value={form.complainant_contact} onChange={e => update('complainant_contact', e.target.value)} className="bg-white/10 border-white/10 text-white h-10 text-sm" />
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-[10px] font-bold text-blue-200 leading-relaxed">
                            Anonymous reports are still legally valid under NH RSA guidelines, but officers may not be able to follow up for clarification.
                        </p>
                    </div>
                </div>
            </div>

            <Button 
                type="submit" 
                disabled={submitting} 
                className="w-full h-16 text-md font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
            >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Report <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></>}
            </Button>
            
            <div className="flex gap-2 items-start p-4 text-slate-400">
                <ClipboardCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-medium leading-relaxed italic">
                    By submitting, you certify that the information is true to the best of your knowledge.
                </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

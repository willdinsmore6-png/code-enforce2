import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '../components/shared/PageHeader';
import { format, addDays } from 'date-fns';
import { 
  ShieldAlert, 
  MapPin, 
  User, 
  ClipboardList, 
  EyeOff, 
  Gavel, 
  Loader2, 
  ArrowRight,
  Info
} from 'lucide-react';

export default function NewComplaint() {
  const navigate = useNavigate();
  const { municipality } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    complaint_date: format(new Date(), 'yyyy-MM-dd'),
    property_address: '',
    property_owner_name: '',
    property_owner_email: '',
    property_owner_phone: '',
    parcel_id: '',
    complainant_name: '',
    complainant_contact: '',
    complainant_anonymous: false,
    violation_type: '',
    violation_description: '',
    specific_code_violated: '',
    priority: 'medium',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const caseNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
      const publicCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Smart Defaults based on town-specific config
      const abatementDays = municipality?.compliance_days_zoning || 10;
      const zbaDays = municipality?.zba_appeal_days || 30;

      const newCase = await base44.entities.Case.create({
        ...form,
        town_id: municipality?.id || null,
        case_number: caseNumber,
        status: 'intake',
        public_access_code: publicCode,
        abatement_deadline: format(addDays(new Date(), abatementDays), 'yyyy-MM-dd'),
        zba_appeal_deadline: format(addDays(new Date(), zbaDays), 'yyyy-MM-dd'),
        daily_penalty_rate: municipality?.penalty_first_offense || 275,
        total_fines_accrued: 0,
        is_first_offense: true,
      });

      await base44.entities.Deadline.bulkCreate([
        {
          case_id: newCase.id,
          deadline_type: 'abatement',
          due_date: format(addDays(new Date(), abatementDays), 'yyyy-MM-dd'),
          description: `Initial Abatement Deadline (${abatementDays} days)`,
          priority: 'high',
        },
        {
          case_id: newCase.id,
          deadline_type: 'zba_appeal',
          due_date: format(addDays(new Date(), zbaDays), 'yyyy-MM-dd'),
          description: `ZBA Appeal Window (${zbaDays} days)`,
          priority: 'medium',
        }
      ]);

      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error('Failed to create complaint:', error);
      alert(`Error: ${error.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Intake New Complaint" 
        description="Initiate a new enforcement file and set statutory timelines." 
      />

      {/* Town Governance Context */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Gavel className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-bold tracking-tight">
            Applying {municipality?.town_name || 'Municipal'} Rules: 
            <span className="text-white/60 ml-2">
              {municipality?.compliance_days_zoning || 10}d Abatement / ${municipality?.penalty_first_offense || 275} Daily Penalty
            </span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          
          {/* Section: Core Info */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Complaint Origin
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Date Received</Label>
                <Input type="date" value={form.complaint_date} onChange={e => update('complaint_date', e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Case Priority</Label>
                <Select value={form.priority} onValueChange={v => update('priority', v)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Life/Safety Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Property */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location & Ownership
            </h3>
            
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase">Property Address *</Label>
              <Input 
                value={form.property_address} 
                onChange={e => update('property_address', e.target.value)} 
                placeholder="Enter street, city, state, zip" 
                required 
                className="h-11 border-primary/20 focus-visible:ring-primary"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Owner Name</Label>
                <Input value={form.property_owner_name} onChange={e => update('property_owner_name', e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Parcel ID / Tax Map</Label>
                <Input value={form.parcel_id} onChange={e => update('parcel_id', e.target.value)} placeholder="000-000-000" className="h-11" />
              </div>
            </div>
          </div>

          {/* Section: Violation Details */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Violation specifics
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Violation Category</Label>
                <Select value={form.violation_type} onValueChange={v => update('violation_type', v)} required>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoning">Zoning Violation</SelectItem>
                    <SelectItem value="building_code">Building Code</SelectItem>
                    <SelectItem value="health_safety">Health & Safety</SelectItem>
                    <SelectItem value="signage">Signage</SelectItem>
                    <SelectItem value="setback">Setback Violation</SelectItem>
                    <SelectItem value="junkyard">Junkyard / Vehicles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase">Code/Statute Reference</Label>
                <Input 
                  value={form.specific_code_violated} 
                  onChange={e => update('specific_code_violated', e.target.value)} 
                  placeholder="e.g. RSA 676:17" 
                  className="h-11 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase">Observation Details</Label>
              <Textarea 
                value={form.violation_description} 
                onChange={e => update('violation_description', e.target.value)} 
                placeholder="Describe what was observed during initial intake or complaint..."
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar: Complainant & Actions */}
        <div className="space-y-6">
          <div className="bg-muted/50 rounded-2xl p-6 border border-border space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> Complainant
            </h3>
            
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm">
              <Checkbox 
                id="anonymous" 
                className="rounded-md h-5 w-5"
                checked={form.complainant_anonymous} 
                onCheckedChange={v => update('complainant_anonymous', v)} 
              />
              <Label htmlFor="anonymous" className="text-xs font-bold cursor-pointer">File as Anonymous</Label>
            </div>

            {!form.complainant_anonymous && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Full Name</Label>
                  <Input value={form.complainant_name} onChange={e => update('complainant_name', e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Contact Method</Label>
                  <Input value={form.complainant_contact} onChange={e => update('complainant_contact', e.target.value)} className="h-10 text-sm" />
                </div>
              </div>
            )}
            
            {form.complainant_anonymous && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <EyeOff className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 leading-tight">
                  Identity will be suppressed on all public-facing portals.
                </p>
              </div>
            )}
          </div>

          <div className="p-2 bg-primary/5 rounded-2xl border border-primary/10">
            <Button 
              type="submit" 
              className="w-full h-14 text-md font-black uppercase tracking-wider shadow-xl shadow-primary/20 group" 
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Open Enforcement Case <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </div>

          <div className="flex gap-2 items-start p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Submitting this form creates a new case number and initializes the town-standard abatement timeline.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

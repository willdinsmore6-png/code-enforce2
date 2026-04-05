import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterRecordsForProperty } from '@/lib/propertyAddress';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '../components/shared/PageHeader';
import { format, addDays } from 'date-fns';
import { generatePublicAccessCode } from '@/lib/publicAccessCode';

export default function NewComplaint() {
  const navigate = useNavigate();
  const { municipality } = useAuth();
  const [saving, setSaving] = useState(false);
  const [townCases, setTownCases] = useState([]);
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

  const townKey = municipality?.id != null ? String(municipality.id) : '';

  useEffect(() => {
    if (!townKey) return;
    let cancelled = false;
    (async () => {
      try {
        const [byRoot, byData] = await Promise.all([
          base44.entities.Case.filter({ town_id: townKey }, '-created_date', 400).catch(() => []),
          base44.entities.Case.filter({ 'data.town_id': townKey }, '-created_date', 400).catch(() => []),
        ]);
        const map = new Map();
        for (const c of [...(byRoot || []), ...(byData || [])]) {
          if (c?.id) map.set(c.id, c);
        }
        if (!cancelled) setTownCases([...map.values()]);
      } catch {
        if (!cancelled) setTownCases([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [townKey]);

  const propertyDuplicates = useMemo(
    () => filterRecordsForProperty(townCases, form.property_address, form.parcel_id),
    [townCases, form.property_address, form.parcel_id]
  );

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const caseNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
      const publicCode = generatePublicAccessCode(8);
      
      const newCase = await base44.entities.Case.create({
        ...form,
        town_id: municipality?.id || null,
        case_number: caseNumber,
        status: 'intake',
        public_access_code: publicCode,
        abatement_deadline: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
        zba_appeal_deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        daily_penalty_rate: 275,
        total_fines_accrued: 0,
        is_first_offense: true,
      });

      // Create default deadlines
      await base44.entities.Deadline.bulkCreate([
        {
          case_id: newCase.id,
          deadline_type: 'abatement',
          due_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
          description: `Abatement deadline for ${form.property_address}`,
          priority: 'high',
        },
        {
          case_id: newCase.id,
          deadline_type: 'zba_appeal',
          due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          description: `ZBA appeal window closes for ${form.property_address}`,
          priority: 'medium',
        }
      ]);

      navigate(`/cases/${newCase.id}`);
      setSaving(false);
    } catch (error) {
      console.error('Failed to create complaint:', error);
      alert(`Error creating complaint: ${error.message || 'Unknown error'}`);
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="New Complaint"
        description="File a new code enforcement complaint"
        helpTitle="New complaint"
        helpContent={
          <>
            <p>
              Enter the <strong>property</strong> and <strong>violation</strong> details. Complainant can stay anonymous if allowed by your
              policy. Priority helps triage; abatement and ZBA deadlines are seeded automatically from defaults.
            </p>
            <p>
              After save you land on the new <strong>case</strong> — add investigations, notices, and documents there. A{' '}
              <strong>public access code</strong> is created so the owner can use the public portal when you share it.
            </p>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Complaint Info */}
        <section className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold">Complaint Information</h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Complaint Date *</Label>
              <Input type="date" value={form.complaint_date} onChange={e => update('complaint_date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => update('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Property Info */}
        <section className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold">Property Information</h2>
          <div className="space-y-1.5">
            <Label>Property Address *</Label>
            <Input value={form.property_address} onChange={e => update('property_address', e.target.value)} placeholder="123 Main St, Concord, NH 03301" required />
          </div>
          {propertyDuplicates.length > 0 && (
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-50"
              role="status"
              aria-live="polite"
            >
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Possible duplicate property
              </div>
              <p className="mb-2 text-amber-900/90 dark:text-amber-100/90">
                {propertyDuplicates.length} case(s) already use this address or parcel. Open an existing case or confirm this is a separate
                matter.
              </p>
              <ul className="space-y-1.5">
                {propertyDuplicates.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link className="font-medium underline-offset-4 hover:underline" to={`/cases/${c.id}`}>
                      Case {c.case_number || c.id.slice(0, 8)}
                    </Link>
                    <span className="text-amber-900/80 dark:text-amber-100/80"> — {c.status}</span>
                  </li>
                ))}
              </ul>
              {propertyDuplicates.length > 5 && (
                <p className="mt-2 text-xs opacity-90">Showing 5 of {propertyDuplicates.length}. Use property workspace to see all matches.</p>
              )}
              <p className="mt-2 text-xs">
                <Link to="/property-workspace" className="underline-offset-4 hover:underline">
                  Property workspace
                </Link>
              </p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Property Owner Name</Label>
              <Input value={form.property_owner_name} onChange={e => update('property_owner_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parcel ID</Label>
              <Input value={form.parcel_id} onChange={e => update('parcel_id', e.target.value)} placeholder="e.g., 001-042-003" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Owner Email</Label>
              <Input type="email" value={form.property_owner_email} onChange={e => update('property_owner_email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Phone</Label>
              <Input value={form.property_owner_phone} onChange={e => update('property_owner_phone', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Complainant Info */}
        <section className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold">Complainant Information</h2>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox 
              id="anonymous" 
              checked={form.complainant_anonymous} 
              onCheckedChange={v => update('complainant_anonymous', v)} 
            />
            <Label htmlFor="anonymous" className="text-sm cursor-pointer">Anonymous complaint</Label>
          </div>
          {!form.complainant_anonymous && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Complainant Name</Label>
                <Input value={form.complainant_name} onChange={e => update('complainant_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Info</Label>
                <Input value={form.complainant_contact} onChange={e => update('complainant_contact', e.target.value)} placeholder="Email or phone" />
              </div>
            </div>
          )}
        </section>

        {/* Violation Details */}
        <section className="bg-card rounded-xl border border-border p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold">Violation Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Violation Type *</Label>
              <Select value={form.violation_type} onValueChange={v => update('violation_type', v)} required>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoning">Zoning Violation</SelectItem>
                  <SelectItem value="building_code">Building Code</SelectItem>
                  <SelectItem value="health_safety">Health & Safety</SelectItem>
                  <SelectItem value="signage">Signage</SelectItem>
                  <SelectItem value="setback">Setback Violation</SelectItem>
                  <SelectItem value="use_violation">Use Violation</SelectItem>
                  <SelectItem value="junkyard">Junkyard / Unregistered Vehicles</SelectItem>
                  <SelectItem value="septic">Septic</SelectItem>
                  <SelectItem value="wetlands">Wetlands</SelectItem>
                  <SelectItem value="site_plan">Site Plan Violation</SelectItem>
                  <SelectItem value="subdivision">Subdivision Violation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Specific Code / RSA Violated</Label>
              <Input value={form.specific_code_violated} onChange={e => update('specific_code_violated', e.target.value)} placeholder="e.g., RSA 676:17, Zoning Art. IV §4.3" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Violation Description *</Label>
            <Textarea 
              value={form.violation_description} 
              onChange={e => update('violation_description', e.target.value)} 
              rows={4}
              placeholder="Describe the violation in detail, including what you observed..."
              required
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/cases')}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'File Complaint'}
          </Button>
        </div>
      </form>
    </div>
  );
}

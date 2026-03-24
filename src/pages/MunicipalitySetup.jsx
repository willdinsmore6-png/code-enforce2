import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Building2, Upload, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function MunicipalitySetup() {
  const { user, reloadMunicipality } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '',
    short_name: '',
    municipality_type: 'town',
    state: 'NH',
    address: '',
    contact_email: user?.email || '',
    contact_phone: '',
    website: '',
    logo_url: '',
    tagline: '',
    admin_email: user?.email || '',
  });

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update('logo_url', file_url);
    setUploadingLogo(false);
  }

  async function handleFinish() {
    setSaving(true);
    // Create the Municipality record (only superadmin can create — but this user should be superadmin during setup)
    // For admin onboarding, we use a backend function
    const response = await base44.functions.invoke('createMunicipality', { ...form });
    const municipality = response.data?.municipality;
    if (municipality) {
      // Update own user with municipality_id
      await base44.auth.updateMe({
        municipality_id: municipality.id,
        municipality_name: municipality.short_name || municipality.name,
      });
      await reloadMunicipality();
      setDone(true);
    }
    setSaving(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
          <p className="text-muted-foreground mb-6">Your municipality profile has been created. You can now start managing enforcement cases.</p>
          <Button onClick={() => window.location.href = '/'}>Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to CodeEnforce</h1>
          <p className="text-muted-foreground mt-1">Let's set up your municipality's profile to get started</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`flex items-center gap-2 ${s < 2 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{s}</div>
              {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Municipality Identity</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Official Name *</Label>
                  <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Town of Bow" required />
                  <p className="text-xs text-muted-foreground">Full official name (e.g. "City of Manchester", "Town of Bow")</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Short Name</Label>
                  <Input value={form.short_name} onChange={e => update('short_name', e.target.value)} placeholder="Bow" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.municipality_type} onValueChange={v => update('municipality_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="town">Town</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="village">Village</SelectItem>
                      <SelectItem value="borough">Borough</SelectItem>
                      <SelectItem value="township">Township</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Select value={form.state} onValueChange={v => update('state', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mailing Address</Label>
                  <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="125 N Main St, Bow, NH 03304" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!form.name || !form.state}>
                  Next: Contact & Branding <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Contact & Branding</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="(603) 555-1234" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://www.townofbow.net" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Tagline (optional)</Label>
                  <Input value={form.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Code Enforcement Division" />
                </div>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Municipality Logo (optional)</Label>
                <div className="flex items-center gap-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'Uploading...' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Displayed in the app header and public portal.</p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleFinish} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <>Complete Setup <CheckCircle className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">You can update all of this information later in Admin Tools → Municipality Settings</p>
      </div>
    </div>
  );
}
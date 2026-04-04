import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Upload, X, AlertTriangle, MapPin, Camera, FileText, Shield, Building2 } from 'lucide-react';

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

function isTownActive(t) {
  return String(t?.is_active).toLowerCase() === 'true' || t?.is_active === true;
}

export default function Report() {
  const [searchParams] = useSearchParams();
  const townFromUrl = searchParams.get('town') || searchParams.get('town_id');

  const [townConfig, setTownConfig] = useState(null);
  const [townLoadError, setTownLoadError] = useState(null);
  const [townChoices, setTownChoices] = useState([]);
  const [selectedTownId, setSelectedTownId] = useState('');
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

  const effectiveTownId = useMemo(() => townFromUrl || selectedTownId || '', [townFromUrl, selectedTownId]);

  useEffect(() => {
    let cancelled = false;
    async function resolveTown() {
      setTownLoadError(null);
      setTownChoices([]);

      if (townFromUrl) {
        try {
          const t = await base44.entities.TownConfig.get(townFromUrl);
          if (cancelled) return;
          if (!t) {
            setTownConfig(null);
            setTownLoadError('invalid');
            return;
          }
          if (!isTownActive(t)) {
            setTownConfig(null);
            setTownLoadError('inactive');
            return;
          }
          setTownConfig(t);
          setSelectedTownId(t.id);
        } catch {
          if (!cancelled) {
            setTownConfig(null);
            setTownLoadError('invalid');
          }
        }
        return;
      }

      try {
        const list = await base44.entities.TownConfig.list('-created_date', 300);
        if (cancelled) return;
        const active = (list || []).filter(isTownActive);
        if (active.length === 1) {
          setTownConfig(active[0]);
          setSelectedTownId(active[0].id);
        } else if (active.length === 0) {
          setTownConfig(null);
          setTownLoadError('none');
        } else {
          setTownChoices(active);
          setTownConfig(null);
          setTownLoadError('choose');
        }
      } catch {
        if (!cancelled) {
          setTownConfig(null);
          setTownLoadError('unknown');
        }
      }
    }
    resolveTown();
    return () => { cancelled = true; };
  }, [townFromUrl]);

  useEffect(() => {
    if (townLoadError !== 'choose' || !selectedTownId) return;
    const t = townChoices.find(x => x.id === selectedTownId);
    if (t) setTownConfig(t);
  }, [selectedTownId, townLoadError, townChoices]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  async function handlePhotoAdd(files) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos(prev => [...prev, { url: file_url, name: file.name, preview: URL.createObjectURL(file) }]);
    }
    setUploading(false);
  }

  function validate() {
    const e = {};
    if (!form.property_address.trim()) e.property_address = 'Address is required.';
    if (!form.violation_type) e.violation_type = 'Please select a violation category.';
    if (!form.violation_description.trim()) e.violation_description = 'Please describe the issue.';
    if (!form.complainant_anonymous) {
      if (!form.complainant_name.trim()) e.complainant_name = 'Name is required, or check "Stay Anonymous."';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const tid = effectiveTownId || townConfig?.id;
    if (!tid) {
      setErrors(prev => ({ ...prev, _town: 'Select your municipality before submitting.' }));
      return;
    }
    setSubmitting(true);
    setErrors(prev => ({ ...prev, _submit: null }));
    try {
      const response = await base44.functions.invoke('submitPublicReport', {
        ...form,
        photo_urls: photos.map(p => p.url),
        town_id: tid,
      });
      const data = response.data;
      if (data?.error) {
        setErrors(prev => ({ ...prev, _submit: data.error }));
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, _submit: err?.message || 'Submission failed. Please try again.' }));
    }
    setSubmitting(false);
  }

  const townName = townConfig?.town_name || 'Town';

  const reportShell = 'min-h-screen bg-gradient-to-b from-primary/[0.06] via-background to-background';

  if (townLoadError === 'invalid') {
    return (
      <div className={`${reportShell} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-8 text-center shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="mb-2 text-lg font-bold tracking-tight text-foreground">Invalid report link</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This URL does not match an active municipality. Use the &quot;Report a violation&quot; link from your town&apos;s official website, or contact your code enforcement office.
          </p>
        </div>
      </div>
    );
  }

  if (townLoadError === 'inactive') {
    return (
      <div className={`${reportShell} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-8 text-center shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="mb-2 text-lg font-bold tracking-tight text-foreground">Reporting unavailable</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This municipality&apos;s online reporting is not active. Please call or email your town&apos;s code enforcement office.
          </p>
        </div>
      </div>
    );
  }

  if (townLoadError === 'none') {
    return (
      <div className={`${reportShell} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-8 text-center shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="mb-2 text-lg font-bold tracking-tight text-foreground">No active municipalities</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Public reporting is not configured yet. For assistance, contact{' '}
            <a href="mailto:support@code-enforce.com" className="font-medium text-primary underline underline-offset-2">
              support@code-enforce.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className={`${reportShell} flex items-center justify-center p-4`}>
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-8 text-center shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Report submitted</h1>
          <p className="mb-6 text-muted-foreground">
            Thank you. Your complaint has been received by {townName} code enforcement.
          </p>

          <div className="mb-6 rounded-xl border border-border/80 bg-muted/30 p-5">
            <p className="mb-1 text-sm text-muted-foreground">Your case number</p>
            <p className="font-mono text-xl font-bold text-foreground">{result.case_number}</p>
            <p className="mb-1 mt-3 text-sm text-muted-foreground">Your access code (to check status)</p>
            <p className="inline-block rounded-lg bg-primary/10 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-primary">
              {result.public_access_code}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Save your access code. Visit the Public Portal to track your complaint&apos;s status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.06] via-background to-background">
      <header className="border-b border-border/80 bg-card/70 backdrop-blur-sm" role="banner">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:py-5">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
            <div
              className="h-1 bg-gradient-to-r from-primary/70 via-primary to-primary/50"
              aria-hidden="true"
            />
            <div className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
              {townConfig?.logo_url ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-1.5">
                  <img
                    src={townConfig.logo_url}
                    alt={`${townName} seal`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Building2 className="h-7 w-7" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{townName}</p>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Report a code violation</h1>
                {townConfig?.tagline ? (
                  <p className="mt-1 text-sm text-muted-foreground">{townConfig.tagline}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.03] sm:p-8 dark:ring-white/[0.05]">
          {townLoadError === 'choose' && !townConfig && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
              <p className="mb-2 font-semibold">Select your municipality</p>
              <p className="mb-3 text-amber-900/90 dark:text-amber-50/90">
                For faster filing, use the report link from your town&apos;s website (it includes the correct town ID). If you don&apos;t have that link, choose your town below.
              </p>
              <label htmlFor="town_select" className="sr-only">
                Municipality
              </label>
              <select
                id="town_select"
                className="w-full rounded-lg border border-amber-600/25 bg-background px-3 py-2 text-foreground"
                value={selectedTownId}
                onChange={(e) => setSelectedTownId(e.target.value)}
              >
                <option value="">— Choose town —</option>
                {townChoices.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.town_name || t.short_name || t.id}
                    {t.state ? `, ${t.state}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errors._submit && (
            <div
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {errors._submit}
            </div>
          )}

          <div className="mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-sm leading-relaxed text-foreground">
              <strong className="text-foreground">Your privacy is protected.</strong> You may submit anonymously. All
              reports are reviewed by a code enforcement officer. This form is built for WCAG 2.1 Level AA accessibility.
            </div>
          </div>

          <form noValidate aria-label="Code violation report form" className="space-y-6" onSubmit={handleSubmit}>

          {/* Location */}
          <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              Property location
            </h2>
            <div>
              <Label htmlFor="property_address">
                Street Address <span aria-hidden="true" className="text-red-500">*</span>
              </Label>
              <Input
                id="property_address"
                value={form.property_address}
                onChange={e => update('property_address', e.target.value)}
                placeholder="123 Main Street, Bow, NH 03304"
                aria-required="true"
                aria-describedby={errors.property_address ? 'address-error' : undefined}
                className={`mt-1.5 ${errors.property_address ? 'border-red-400' : ''}`}
              />
              {errors.property_address && (
                <p id="address-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {errors.property_address}
                </p>
              )}
            </div>
          </section>

          {/* Violation Type */}
          <section aria-labelledby="violation-heading">
            <h2 id="violation-heading" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
              Violation details
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="violation_type">
                  Category <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <Select value={form.violation_type} onValueChange={v => update('violation_type', v)}>
                  <SelectTrigger
                    id="violation_type"
                    className={`mt-1.5 ${errors.violation_type ? 'border-red-400' : ''}`}
                    aria-required="true"
                    aria-describedby={errors.violation_type ? 'type-error' : undefined}
                  >
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VIOLATION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.violation_type && (
                  <p id="type-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {errors.violation_type}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="violation_description">
                  Describe the Issue <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="violation_description"
                  value={form.violation_description}
                  onChange={e => update('violation_description', e.target.value)}
                  placeholder="Please describe what you observed, when you observed it, and any other relevant details..."
                  rows={4}
                  aria-required="true"
                  aria-describedby={errors.violation_description ? 'desc-error' : undefined}
                  className={`mt-1.5 resize-none ${errors.violation_description ? 'border-red-400' : ''}`}
                />
                {errors.violation_description && (
                  <p id="desc-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {errors.violation_description}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Photo Upload */}
          <section aria-labelledby="photos-heading">
            <h2 id="photos-heading" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
              Photo evidence{' '}
              <span className="text-sm font-normal text-muted-foreground">(optional but recommended)</span>
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Photos are timestamped upon upload. Clear photos strengthen enforcement action under RSA 676:17.
            </p>
            <div className="rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="mb-1 text-sm font-medium text-foreground">Drag & drop photos here</p>
              <p className="mb-3 text-xs text-muted-foreground">JPG, PNG, HEIC accepted</p>
              <div className="flex flex-wrap justify-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted/50">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Browse files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={e => handlePhotoAdd(e.target.files)}
                    aria-label="Upload photo evidence"
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted/50">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Take photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={e => handlePhotoAdd(e.target.files)}
                    aria-label="Take a photo with camera"
                  />
                </label>
              </div>
            </div>
            {uploading && (
              <p className="mt-2 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                Uploading photos…
              </p>
            )}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Uploaded photos">
                {photos.map((p, i) => (
                  <div key={i} className="relative" role="listitem">
                    <img
                      src={p.preview}
                      alt={`Evidence photo ${i + 1}: ${p.name}`}
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Your Information */}
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              Your information
            </h2>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 p-3">
              <input
                type="checkbox"
                id="anonymous"
                checked={form.complainant_anonymous}
                onChange={(e) => update('complainant_anonymous', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="anonymous" className="cursor-pointer text-sm font-medium">
                Submit anonymously — do not include my contact information
              </Label>
            </div>

            {!form.complainant_anonymous && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complainant_name">
                    Your Name <span aria-hidden="true" className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="complainant_name"
                    value={form.complainant_name}
                    onChange={e => update('complainant_name', e.target.value)}
                    placeholder="Jane Smith"
                    aria-required="true"
                    aria-describedby={errors.complainant_name ? 'name-error' : undefined}
                    className={`mt-1.5 ${errors.complainant_name ? 'border-red-400' : ''}`}
                  />
                  {errors.complainant_name && (
                    <p id="name-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {errors.complainant_name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="complainant_contact">Phone or Email</Label>
                  <Input
                    id="complainant_contact"
                    value={form.complainant_contact}
                    onChange={e => update('complainant_contact', e.target.value)}
                    placeholder="(603) 555-0100 or email@example.com"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting || uploading || !townConfig}
              className="w-full h-11 text-base"
              aria-busy={submitting}
            >
              {submitting ? 'Submitting Report...' : 'Submit Violation Report'}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              By submitting, you certify the information is accurate to the best of your knowledge. Reports are retained
              per NH RSA 33-A records retention requirements.
            </p>
          </div>
        </form>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground" role="contentinfo">
        {townName} code enforcement · public complaint portal
      </footer>
    </div>
  );
}

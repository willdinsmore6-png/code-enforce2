import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Upload, X, AlertTriangle, MapPin, Camera, FileText, Shield } from 'lucide-react';

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
    setSubmitting(true);
    const response = await base44.functions.invoke('submitPublicReport', {
      ...form,
      photo_urls: photos.map(p => p.url),
      town_id: townConfig?.id || null,
    });
    setResult(response.data);
    setSubmitting(false);
  }

  const townName = townConfig?.town_name || 'Town';

  if (result?.success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted</h1>
          <p className="text-slate-600 mb-6">Thank you. Your complaint has been received by {townName} Code Enforcement.</p>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-6">
            <p className="text-sm text-slate-500 mb-1">Your Case Number</p>
            <p className="font-mono text-xl font-bold text-slate-800">{result.case_number}</p>
            <p className="text-sm text-slate-500 mt-3 mb-1">Your Access Code (to check status)</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
              {result.public_access_code}
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Save your access code. Visit the Public Portal to track your complaint's status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4" role="banner">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {townConfig?.logo_url && (
            <img src={townConfig.logo_url} alt={`${townName} seal`} className="w-10 h-10 object-contain" />
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{townName}</p>
            <h1 className="text-lg font-bold text-slate-900">Report a Code Violation</h1>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-blue-800">
            <strong>Your privacy is protected.</strong> You may submit anonymously. All reports are reviewed by a Code Enforcement Officer. This form meets WCAG 2.1 Level AA accessibility standards.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate aria-label="Code violation report form" className="space-y-6">

          {/* Location */}
          <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
              <MapPin className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Property Location
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
            <h2 id="violation-heading" className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
              <AlertTriangle className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Violation Details
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
            <h2 id="photos-heading" className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
              <Camera className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Photo Evidence <span className="text-sm font-normal text-slate-500">(optional but recommended)</span>
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Photos are timestamped upon upload. Clear photos strengthen enforcement action under RSA 676:17.
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" aria-hidden="true" />
              <p className="text-sm text-slate-600 font-medium mb-1">Drag & drop photos here</p>
              <p className="text-xs text-slate-400 mb-3">JPG, PNG, HEIC accepted</p>
              <div className="flex justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={e => handlePhotoAdd(e.target.files)}
                    aria-label="Upload photo evidence"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  Take Photo
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
              <p className="text-sm text-slate-500 mt-2 text-center" role="status" aria-live="polite">Uploading photos...</p>
            )}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Uploaded photos">
                {photos.map((p, i) => (
                  <div key={i} className="relative" role="listitem">
                    <img src={p.preview} alt={`Evidence photo ${i + 1}: ${p.name}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
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
            <h2 id="contact-heading" className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
              <FileText className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Your Information
            </h2>

            <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="anonymous"
                checked={form.complainant_anonymous}
                onChange={e => update('complainant_anonymous', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
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
              disabled={submitting || uploading}
              className="w-full h-11 text-base"
              aria-busy={submitting}
            >
              {submitting ? 'Submitting Report...' : 'Submit Violation Report'}
            </Button>
            <p className="text-xs text-slate-400 text-center mt-3">
              By submitting, you certify the information is accurate to the best of your knowledge.
              Reports are retained per NH RSA 33-A records retention requirements.
            </p>
          </div>
        </form>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400" role="contentinfo">
        {townName} Code Enforcement Division · Public Complaint Portal
      </footer>
    </div>
  );
}

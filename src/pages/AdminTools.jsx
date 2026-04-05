import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '../components/shared/PageHeader';
import { KeyRound, CheckCircle, AlertTriangle, ClipboardList, Download, Building2, Users, Upload, Loader2, UserPlus, X, Hash, Link2, Sparkles, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function numOrDefault(v, fallback) {
  if (v === '' || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function AdminTools() {
  const { user, municipality, impersonatedMunicipality, refreshMunicipality } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTownId, setInviteTownId] = useState('');
  const [towns, setTowns] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterCase, setFilterCase] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [muniForm, setMuniForm] = useState({
    name: '', short_name: '', municipality_type: 'town', state: 'NH',
    address: '', contact_email: '', contact_phone: '', website: '',
    tagline: '', logo_url: '',
    gis_map_url: '',
    adopted_building_codes_summary: '',
    compliance_days_zoning: 30,
    compliance_days_building: 30,
    zba_appeal_days: 30,
    penalty_first_offense: 275,
    penalty_subsequent: 550,
    specific_regulations: '',
    notes: '',
    ordinance_docs: [],
    ordinance_doc_names: [],
  });
  const [savingMuni, setSavingMuni] = useState(false);
  const [muniSaved, setMuniSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingOrdinance, setUploadingOrdinance] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [adminTab, setAdminTab] = useState('municipality');

  const loadAuditLogs = useCallback(async () => {
    if (!municipality?.id) {
      setAuditLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    try {
      const townId = String(municipality.id);
      const [byTown, caseList] = await Promise.all([
        base44.entities.AuditLog.filter({ town_id: townId }, '-timestamp', 2500),
        base44.entities.Case.list('-created_date', 6000),
      ]);
      const caseIds = new Set(
        (caseList || [])
          .filter((c) => String(c.town_id || c.data?.town_id || '') === townId)
          .map((c) => c.id)
      );
      let recent = [];
      try {
        recent = (await base44.entities.AuditLog.list('-timestamp', 800)) || [];
      } catch {
        recent = [];
      }
      const orphans = recent.filter(
        (l) =>
          l.case_id &&
          (!l.town_id || String(l.town_id).trim() === '') &&
          caseIds.has(l.case_id)
      );
      const map = new Map();
      for (const l of [...(byTown || []), ...orphans]) {
        if (l?.id) map.set(l.id, l);
      }
      const merged = [...map.values()].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setAuditLogs(merged);
    } catch (e) {
      console.error(e);
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [municipality?.id]);

  useEffect(() => {
    if (municipality) {
      setMuniForm(f => ({
        ...f,
        name: municipality.town_name || '',
        short_name: municipality.short_name || '',
        state: municipality.state || 'NH',
        logo_url: municipality.logo_url || '',
        tagline: municipality.tagline || '',
        contact_email: municipality.contact_email || '',
        contact_phone: municipality.contact_phone || '',
        website: municipality.website || '',
        address: municipality.address || '',
        gis_map_url: municipality.gis_map_url || '',
        adopted_building_codes_summary: municipality.adopted_building_codes_summary || '',
        compliance_days_zoning: numOrDefault(municipality.compliance_days_zoning, 30),
        compliance_days_building: numOrDefault(municipality.compliance_days_building, 30),
        zba_appeal_days: numOrDefault(municipality.zba_appeal_days, 30),
        penalty_first_offense: numOrDefault(municipality.penalty_first_offense, 275),
        penalty_subsequent: numOrDefault(municipality.penalty_subsequent, 550),
        specific_regulations: municipality.specific_regulations || '',
        notes: municipality.notes || '',
        ordinance_docs: municipality.ordinance_docs || [],
        ordinance_doc_names: municipality.ordinance_doc_names || [],
      }));
    }
  }, [municipality]);

  useEffect(() => {
    base44.functions.invoke(
      'getUsers',
      mergeActingTownPayload(user, impersonatedMunicipality, { town_id: municipality?.id })
    ).then(r => {
      setUsers(r.data?.users || []);
      setLoadingUsers(false);
    });
    if (user?.role === 'superadmin') {
      base44.entities.TownConfig.list('town_name', 100).then(t => setTowns(t || []));
    } else if (municipality) {
      setInviteTownId(municipality.id);
    }
    loadAuditLogs();
  }, [municipality?.id, user, impersonatedMunicipality, loadAuditLogs]);

  const filteredLogs = auditLogs.filter(log =>
    !filterCase || (log.case_number || '').toLowerCase().includes(filterCase.toLowerCase()) ||
    (log.case_id || '').toLowerCase().includes(filterCase.toLowerCase())
  );

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await base44.functions.invoke(
        'inviteStaffUser',
        mergeActingTownPayload(user, impersonatedMunicipality, {
          email: inviteEmail.trim(),
          role: 'user',
          town_id: inviteTownId || municipality?.id,
        })
      );
      if (res.data?.error) throw new Error(res.data.error);
      setInviteResult({ success: true, message: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      const r = await base44.functions.invoke(
        'getUsers',
        mergeActingTownPayload(user, impersonatedMunicipality, {})
      );
      setUsers(r.data?.users || []);
    } catch (err) {
      setInviteResult({ success: false, message: err?.message || 'Failed to send invite. Please try again.' });
    }
    setInviting(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetLoading(true);
    setResetResult(null);
    const response = await base44.functions.invoke(
      'adminResetPassword',
      mergeActingTownPayload(user, impersonatedMunicipality, { email: resetEmail.trim() })
    );
    if (response.data?.success) {
      setResetResult({ success: true, message: response.data.message });
      setResetEmail('');
    } else {
      setResetResult({ success: false, message: response.data?.error || 'Something went wrong.' });
    }
    setResetLoading(false);
  }

  async function handleCancelInvite(userId, userEmail) {
    if (!window.confirm(`Cancel the invite for ${userEmail}?`)) return;
    try {
      const r = await base44.functions.invoke(
        'deleteUser',
        mergeActingTownPayload(user, impersonatedMunicipality, { userId })
      );
      if (r.data?.error) throw new Error(r.data.error);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(`Unable to cancel this invite directly.\n\nPlease contact the app developer to make this change.`);
    }
  }

  async function handleRemoveUser(userId, userEmail) {
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from the system?`)) return;
    try {
      const r = await base44.functions.invoke(
        'deleteUser',
        mergeActingTownPayload(user, impersonatedMunicipality, { userId })
      );
      if (r.data?.error) throw new Error(r.data.error);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(`Unable to remove this user directly.\n\nPlease contact the app developer to make this change.`);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      const r = await base44.functions.invoke(
        'updateUserRole',
        mergeActingTownPayload(user, impersonatedMunicipality, { userId, role: newRole })
      );
      if (r.data?.error) throw new Error(r.data.error);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Unable to change this user's role directly.\n\nPlease contact the app developer to make this change.`);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMuniForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  }

  async function handleOrdinanceUpload(e) {
    const file = e.target.files[0];
    if (!file || !municipality?.id) return;
    setUploadingOrdinance(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existingDocs = muniForm.ordinance_docs || [];
      const existingNames = muniForm.ordinance_doc_names || [];
      const newDocEntry = { url: file_url, name: file.name, uploaded_at: new Date().toISOString() };
      const updated = await base44.entities.TownConfig.update(municipality.id, {
        ordinance_docs: [...existingDocs, file_url],
        ordinance_doc_names: [...existingNames, newDocEntry],
      });
      setMuniForm((f) => ({
        ...f,
        ordinance_docs: updated.ordinance_docs || [],
        ordinance_doc_names: updated.ordinance_doc_names || [],
      }));
      if (refreshMunicipality) refreshMunicipality();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Could not upload ordinance file.');
    } finally {
      setUploadingOrdinance(false);
      if (e.target) e.target.value = '';
    }
  }

  async function removeOrdinance(index) {
    if (!municipality?.id) return;
    const newNames = (muniForm.ordinance_doc_names || []).filter((_, i) => i !== index);
    const newDocs = (muniForm.ordinance_docs || []).filter((_, i) => i !== index);
    try {
      const updated = await base44.entities.TownConfig.update(municipality.id, {
        ordinance_docs: newDocs,
        ordinance_doc_names: newNames,
      });
      setMuniForm((f) => ({
        ...f,
        ordinance_docs: updated.ordinance_docs || [],
        ordinance_doc_names: updated.ordinance_doc_names || [],
      }));
      if (refreshMunicipality) refreshMunicipality();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Could not remove file.');
    }
  }

  async function handleSaveMuni(e) {
    e.preventDefault();
    if (!municipality?.id) return;
    setSavingMuni(true);
    await base44.entities.TownConfig.update(municipality.id, {
        town_name: muniForm.name || muniForm.town_name,
        state: muniForm.state,
        logo_url: muniForm.logo_url,
        tagline: muniForm.tagline,
        short_name: muniForm.short_name,
        contact_email: muniForm.contact_email,
        contact_phone: muniForm.contact_phone,
        website: muniForm.website,
        address: muniForm.address,
        gis_map_url: (muniForm.gis_map_url || '').trim(),
        adopted_building_codes_summary: (muniForm.adopted_building_codes_summary || '').trim(),
        compliance_days_zoning: numOrDefault(muniForm.compliance_days_zoning, 30),
        compliance_days_building: numOrDefault(muniForm.compliance_days_building, 30),
        zba_appeal_days: numOrDefault(muniForm.zba_appeal_days, 30),
        penalty_first_offense: numOrDefault(muniForm.penalty_first_offense, 275),
        penalty_subsequent: numOrDefault(muniForm.penalty_subsequent, 550),
        specific_regulations: (muniForm.specific_regulations || '').trim(),
        notes: (muniForm.notes || '').trim(),
        ordinance_docs: muniForm.ordinance_docs || [],
        ordinance_doc_names: muniForm.ordinance_doc_names || [],
      });
    setSavingMuni(false);
    setMuniSaved(true);
    if (refreshMunicipality) refreshMunicipality();
    setTimeout(() => setMuniSaved(false), 3000);
  }

  function exportToCSV() {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map(log => ({
      Timestamp: log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
      User: log.user_name || log.user_email || '',
      Email: log.user_email || '',
      Case: log.case_number || log.case_id || '',
      'Entity Type': log.entity_type || '',
      Action: log.action || '',
      Changes: log.changes || '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground text-sm">You don't have permission to access Admin Tools.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="sr-only">Admin Tools</h1>
      <PageHeader
        title="Admin Tools"
        description="Municipality profile, enforcement deadlines, Meridian (AI) context, users, audit log, and security"
        helpTitle="Admin tools"
        helpContent={
          <>
            <p>
              <strong>Municipality</strong> updates branding, GIS link, enforcement deadlines (abatement / ZBA appeal windows), penalties,
              and {MERIDIAN_DISPLAY_NAME} training context (ordinance PDFs, notes). <strong>Users</strong> manages accounts.{' '}
              <strong>Audit log</strong> shows key actions; <strong>Security</strong> covers access-related settings.
            </p>
            <p>Changes here affect everyone in the municipality — double-check before saving destructive actions.</p>
          </>
        }
      />

      <Tabs
        value={adminTab}
        onValueChange={(v) => {
          setAdminTab(v);
          if (v === 'audit') loadAuditLogs();
        }}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="municipality" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Municipality</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Audit Log</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Security</TabsTrigger>
        </TabsList>

        {/* Municipality Settings */}
        <TabsContent value="municipality">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {muniForm.logo_url ? <img src={muniForm.logo_url} alt="" className="w-full h-full object-contain p-0.5" /> : <Building2 className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h2 className="font-semibold">Municipality Profile</h2>
                <p className="text-sm text-muted-foreground">Public-facing information and branding</p>
              </div>
            </div>

            <form onSubmit={handleSaveMuni} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Official Name</Label>
                  <Input value={muniForm.name} onChange={e => setMuniForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Name</Label>
                  <Input value={muniForm.short_name} onChange={e => setMuniForm(f => ({ ...f, short_name: e.target.value }))} placeholder="e.g. Bow" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select value={muniForm.state} onValueChange={v => setMuniForm(f => ({ ...f, state: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NH">New Hampshire</SelectItem>
                      <SelectItem value="ME">Maine</SelectItem>
                      <SelectItem value="VT">Vermont</SelectItem>
                      <SelectItem value="MA">Massachusetts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={muniForm.contact_email} onChange={e => setMuniForm(f => ({ ...f, contact_email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={muniForm.contact_phone} onChange={e => setMuniForm(f => ({ ...f, contact_phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={muniForm.website} onChange={e => setMuniForm(f => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Mailing Address</Label>
                  <Input value={muniForm.address} onChange={e => setMuniForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Tagline (shown in app header)</Label>
                  <Input value={muniForm.tagline} onChange={e => setMuniForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Code Enforcement Division" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Enforcement &amp; deadline defaults</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used when filing new complaints (abatement / ZBA dates, default daily penalty) and in staff deadline guidance. Confirm
                    with your attorney for your jurisdiction.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="compliance_days_zoning">Abatement / compliance days (zoning)</Label>
                    <Input
                      id="compliance_days_zoning"
                      type="number"
                      min={0}
                      value={muniForm.compliance_days_zoning}
                      onChange={(e) =>
                        setMuniForm((f) => ({ ...f, compliance_days_zoning: e.target.value === '' ? '' : +e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">New complaint abatement deadline</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="compliance_days_building">Compliance days (building)</Label>
                    <Input
                      id="compliance_days_building"
                      type="number"
                      min={0}
                      value={muniForm.compliance_days_building}
                      onChange={(e) =>
                        setMuniForm((f) => ({ ...f, compliance_days_building: e.target.value === '' ? '' : +e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">Reference for building-code matters</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="zba_appeal_days">ZBA appeal window (days)</Label>
                    <Input
                      id="zba_appeal_days"
                      type="number"
                      min={0}
                      value={muniForm.zba_appeal_days}
                      onChange={(e) =>
                        setMuniForm((f) => ({ ...f, zba_appeal_days: e.target.value === '' ? '' : +e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">From complaint intake; RSA 676:5 — verify locally</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="penalty_first_offense">Daily penalty — first offense ($)</Label>
                    <Input
                      id="penalty_first_offense"
                      type="number"
                      min={0}
                      value={muniForm.penalty_first_offense}
                      onChange={(e) =>
                        setMuniForm((f) => ({ ...f, penalty_first_offense: e.target.value === '' ? '' : +e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="penalty_subsequent">Daily penalty — subsequent ($)</Label>
                    <Input
                      id="penalty_subsequent"
                      type="number"
                      min={0}
                      value={muniForm.penalty_subsequent}
                      onChange={(e) =>
                        setMuniForm((f) => ({ ...f, penalty_subsequent: e.target.value === '' ? '' : +e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="gis_map_url">GIS / parcel viewer URL (optional)</Label>
                  <Input
                    id="gis_map_url"
                    type="url"
                    inputMode="url"
                    value={muniForm.gis_map_url}
                    onChange={(e) => setMuniForm((f) => ({ ...f, gis_map_url: e.target.value }))}
                    placeholder="https://… (town assessor or ArcGIS web map)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for quick links from the property workspace and staff workflows. Opens in a new browser tab.
                  </p>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="adopted_codes">Adopted codes summary (for staff &amp; assistant context)</Label>
                  <Textarea
                    id="adopted_codes"
                    value={muniForm.adopted_building_codes_summary}
                    onChange={(e) => setMuniForm((f) => ({ ...f, adopted_building_codes_summary: e.target.value }))}
                    rows={5}
                    placeholder="e.g. NH State Building Code based on 2021 I-Codes effective [date]; local amendments: [chapter/section]; electrical NFPA 70 edition…"
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Does not replace legal advice — documents the editions your building official enforces so {MERIDIAN_DISPLAY_NAME} and
                    workflows stay aligned.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
                  <h3 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                    {MERIDIAN_DISPLAY_NAME} (AI assistant) context
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Free-text and ordinance files the assistant can use with your town settings. Configure everything here — the{' '}
                  {MERIDIAN_DISPLAY_NAME} page is chat only.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="specific_regulations">Local regulations summary</Label>
                  <Textarea
                    id="specific_regulations"
                    rows={4}
                    value={muniForm.specific_regulations}
                    onChange={(e) => setMuniForm((f) => ({ ...f, specific_regulations: e.target.value }))}
                    placeholder="Key zoning articles, setback tables, permit thresholds, special districts…"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="town_notes">Internal notes (optional)</Label>
                  <Textarea
                    id="town_notes"
                    rows={3}
                    value={muniForm.notes}
                    onChange={(e) => setMuniForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Staff reminders, counsel contacts, seasonal policies…"
                  />
                </div>
                {municipality?.id && (
                  <div className="space-y-2 border-t border-indigo-200/60 pt-4 dark:border-indigo-900/50">
                    <Label>Ordinance / training files for {MERIDIAN_DISPLAY_NAME}</Label>
                    <p className="text-xs text-muted-foreground">
                      PDFs or text files are attached to the assistant&apos;s context when staff chat. Uploads save immediately.
                    </p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                      {uploadingOrdinance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingOrdinance ? 'Uploading…' : 'Upload PDF or document'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                        onChange={handleOrdinanceUpload}
                      />
                    </label>
                    {(muniForm.ordinance_doc_names || []).length > 0 && (
                      <ul className="space-y-1.5">
                        {(muniForm.ordinance_doc_names || []).map((doc, i) => (
                          <li
                            key={`${doc.url || doc.name || i}-${i}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
                          >
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                              <span className="truncate">{doc.name || doc}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOrdinance(i)}
                              className="shrink-0 text-destructive hover:underline"
                              aria-label={`Remove ${doc.name || 'file'}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {municipality?.id && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="w-4 h-4 text-primary" />
                    Public violation report link
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Post this URL on your municipal website so resident reports are tied to your town and receive a public access code.
                  </p>
                  <code className="block break-all text-xs bg-background p-3 rounded-lg border border-border">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/report?town=${municipality.id}`}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const url = `${window.location.origin}/report?town=${municipality.id}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {muniForm.logo_url ? (
                    <img src={muniForm.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'Uploading...' : muniForm.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </div>
                  </label>
                  {muniForm.logo_url && (
                    <button type="button" onClick={() => setMuniForm(f => ({ ...f, logo_url: '' }))} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingMuni}>{savingMuni ? 'Saving...' : 'Save Changes'}</Button>
                {muniSaved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saved!</span>}
              </div>
            </form>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold">Invite Staff User</h2>
                <p className="text-sm text-muted-foreground">Invite someone to join your municipality's enforcement team</p>
              </div>
            </div>
            <form onSubmit={handleInvite} className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="officer@yourtown.gov" required />
              </div>
              {user?.role === 'superadmin' && (
                <div className="min-w-[180px] space-y-1.5">
                  <Label>Assign to Town</Label>
                  <Select value={inviteTownId} onValueChange={setInviteTownId}>
                    <SelectTrigger><SelectValue placeholder="Select town..." /></SelectTrigger>
                    <SelectContent>
                      {towns.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.town_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" disabled={inviting} className="gap-1.5">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
            {inviteResult && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {inviteResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {inviteResult.message}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Team Members ({users.length})</h2>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : (
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{u.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {!u.full_name ? (
                      <button
                        type="button"
                        onClick={() => handleCancelInvite(u.id, u.email)}
                        className="text-xs text-amber-600 hover:text-amber-700 border border-amber-200 bg-amber-50 px-2 py-1 rounded-md transition-colors flex-shrink-0"
                        title="Cancel invite"
                      >
                        Cancel Invite
                      </button>
                    ) : (
                      <>
                        <Select value={u.role || 'user'} onValueChange={val => handleRoleChange(u.id, val)}>
                          <SelectTrigger className={`h-7 text-xs px-2 w-24 border-0 font-medium ${u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(u.id, u.email)}
                          className="text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0"
                          title="Remove user"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">No team members yet. Invite someone above.</div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold">Case Modification Audit Log</h2>
                  <p className="text-sm text-muted-foreground">All edits to cases, notices, and documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input placeholder="Filter by case #..." value={filterCase} onChange={e => setFilterCase(e.target.value)} className="w-44" />
                <Button variant="outline" size="sm" onClick={() => loadAuditLogs()} disabled={logsLoading} className="gap-1.5">
                  {logsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredLogs.length === 0} className="gap-1.5">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No audit log entries found.</p>
            ) : (
              <div className="overflow-x-auto" role="region" aria-labelledby="audit-log-heading" tabIndex="0">
                <table className="w-full text-sm" role="table" aria-label="Audit log of case modifications">
                  <thead>
                    <tr className="border-b border-border" role="row">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground" scope="col">Timestamp</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground" scope="col">User</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground" scope="col">Case</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground" scope="col">Type</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground" scope="col">Action</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground" scope="col">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy h:mm a') : '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <p className="font-medium text-xs">{log.user_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{log.user_email}</p>
                        </td>
                        <td className="py-2 pr-4 text-xs font-mono">{log.case_number || log.case_id?.slice(0, 8) || '—'}</td>
                        <td className="py-2 pr-4"><span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{log.entity_type}</span></td>
                        <td className="py-2 pr-4 text-xs">{log.action}</td>
                        <td className="py-2 text-xs text-muted-foreground max-w-xs">
                          {log.changes ? (
                            <details className="cursor-pointer">
                              <summary className="text-primary hover:underline">View</summary>
                              <pre className="mt-1 text-[10px] bg-muted p-2 rounded overflow-x-auto max-w-xs">
                                {(() => { try { return JSON.stringify(JSON.parse(log.changes), null, 2); } catch { return log.changes; } })()}
                              </pre>
                            </details>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Hash className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold">Backfill Public Access Codes</h2>
                <p className="text-sm text-muted-foreground">Generate access codes for existing cases that are missing them</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                setBackfilling(true);
                setBackfillResult(null);
                const res = await base44.functions.invoke(
                  'backfillAccessCodes',
                  mergeActingTownPayload(user, impersonatedMunicipality, {})
                );
                setBackfillResult(res.data);
                setBackfilling(false);
              }}
              disabled={backfilling}
              variant="outline"
              className="gap-2"
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
              {backfilling ? 'Running...' : 'Run Backfill'}
            </Button>
            {backfillResult && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg text-sm ${backfillResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {backfillResult.success
                  ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Updated {backfillResult.updated} of {backfillResult.total} cases with new access codes.</>
                  : <><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {backfillResult.error}</>}
              </div>
            )}
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Send Password Reset</h2>
                <p className="text-sm text-muted-foreground">Send a password reset email to a user</p>
              </div>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label>User Email Address</Label>
                <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="user@example.com" required />
              </div>
              <Button type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send Reset Email'}</Button>
            </form>
            {resetResult && (
              <div className={`mt-4 flex items-start gap-2 p-4 rounded-lg text-sm ${resetResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {resetResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <p>{resetResult.message}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

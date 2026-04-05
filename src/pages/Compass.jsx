import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Upload, Settings, Loader2, Building2, FileText, Trash2, RotateCcw, X, Info } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';

export default function CompassPage() {
  const { user, municipality } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [townConfig, setTownConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ 
    town_name: '', state: 'NH', compliance_days_zoning: 30, 
    compliance_days_building: 30, zba_appeal_days: 30, 
    penalty_first_offense: 275, penalty_subsequent: 550, 
    specific_regulations: '', notes: '' 
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocNames, setUploadedDocNames] = useState([]);
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);
  const [docsSharedWithAgent, setDocsSharedWithAgent] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const planInputRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [zoningDeterminations, setZoningDeterminations] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedZoningDetermination, setSelectedZoningDetermination] = useState('');
  const [showReviewWaitNotice, setShowReviewWaitNotice] = useState(false);
  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (municipality) {
      setTownConfig(municipality);
      setConfigForm(f => ({ ...f, ...municipality }));
      setUploadedDocNames(municipality.ordinance_doc_names || []);
    } else {
      setShowConfig(isAdmin);
    }
  }, [municipality, isAdmin]);

  // Persistent town-specific filtering for Super Admins
  useEffect(() => {
    async function loadCasesAndZoning() {
      const activeTownId = municipality?.id || user?.town_id;
      const townKey = activeTownId != null && activeTownId !== '' ? String(activeTownId) : '';
      try {
        if (townKey) {
          const [byRoot, byDataBag, zd] = await Promise.all([
            base44.entities.Case.filter({ town_id: townKey }, '-created_date', 500).catch(() => []),
            base44.entities.Case.filter({ 'data.town_id': townKey }, '-created_date', 500).catch(() => []),
            base44.entities.ZoningDetermination.filter({ town_id: townKey }, '-created_date', 150).catch(() => []),
          ]);
          const caseMap = new Map();
          for (const ca of [...(byRoot || []), ...(byDataBag || [])]) {
            if (ca?.id) caseMap.set(ca.id, ca);
          }
          const merged = [...caseMap.values()].filter(
            (ca) => !['resolved', 'closed'].includes(ca.status)
          );
          merged.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
          setCases(merged);
          setZoningDeterminations(zd || []);
          return;
        }
        if (user?.role === 'superadmin') {
          const [c, zd] = await Promise.all([
            base44.entities.Case.list('-created_date', 2500),
            base44.entities.ZoningDetermination.list('-created_date', 150),
          ]);
          setCases((c || []).filter((ca) => !['resolved', 'closed'].includes(ca.status)));
          setZoningDeterminations(zd || []);
        }
      } catch (error) {
        console.error('Error loading Meridian context lists:', error);
      }
    }
    loadCasesAndZoning();
  }, [municipality, user]);

  useEffect(() => {
    async function initConversation() {
      const savedId = sessionStorage.getItem('compass_conversation_id');
      if (savedId) {
        try {
          const existing = await base44.agents.getConversation(savedId);
          if (existing?.id) {
            setConversation(existing);
            const cached = sessionStorage.getItem('compass_messages');
            setMessages(cached ? JSON.parse(cached) : (existing.messages || []));
            if (existing.messages?.length > 0) setDocsSharedWithAgent(true);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem('compass_conversation_id');
        }
      }
      const conv = await base44.agents.createConversation({
        agent_name: 'compass',
        metadata: {
          name: `${MERIDIAN_DISPLAY_NAME} session`,
          town_id: municipality?.id || user?.town_id || null,
        },
      });
      sessionStorage.setItem('compass_conversation_id', conv.id);
      setConversation(conv);
      setMessages(conv.messages || []);
    }
    initConversation();
  }, []);

  useEffect(() => {
    const handler = (e) => setMessages(e.detail.messages || []);
    window.addEventListener('compass_update', handler);
    return () => window.removeEventListener('compass_update', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startNewChat() {
    sessionStorage.removeItem('compass_conversation_id');
    sessionStorage.removeItem('compass_messages');
    setConversation(null);
    setMessages([]);
    setDocsSharedWithAgent(false);
    setPlanFile(null);
    setShowReviewWaitNotice(false);
    if (planInputRef.current) planInputRef.current.value = '';
    const conv = await base44.agents.createConversation({
      agent_name: 'compass',
      metadata: {
        name: `${MERIDIAN_DISPLAY_NAME} session`,
        town_id: municipality?.id || user?.town_id || null,
      },
    });
    sessionStorage.setItem('compass_conversation_id', conv.id);
    setConversation(conv);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    if (selectedCase || selectedZoningDetermination) {
      setShowReviewWaitNotice(true);
    }
    const caseContext = selectedCase ? ` [Analyzing case ID: ${selectedCase}]` : '';
    const zdContext = selectedZoningDetermination
      ? ` [Analyzing zoning determination ID: ${selectedZoningDetermination}]`
      : '';
    const messagePayload = { role: 'user', content: msg + caseContext + zdContext };

    const file_urls = [];
    const ordinanceUrls = townConfig?.ordinance_docs || [];
    if (ordinanceUrls.length > 0 && !docsSharedWithAgent) {
      file_urls.push(...ordinanceUrls);
      setDocsSharedWithAgent(true);
    }
    if (planFile) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: planFile });
        if (file_url) file_urls.push(file_url);
      } catch (err) {
        console.error('Plan upload failed:', err);
      }
      setPlanFile(null);
      if (planInputRef.current) planInputRef.current.value = '';
    }
    if (file_urls.length > 0) {
      messagePayload.file_urls = file_urls;
    }

    await base44.agents.addMessage(conversation, messagePayload);
    setSending(false);
  }

  async function saveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      if (townConfig?.id) {
        const updated = await base44.entities.TownConfig.update(townConfig.id, configForm);
        setTownConfig(updated);
      } else {
        const created = await base44.entities.TownConfig.create({ ...configForm, is_active: true });
        setTownConfig(created);
      }
      setShowConfig(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file || !townConfig?.id) return;
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existingDocs = townConfig.ordinance_docs || [];
      const existingNames = townConfig.ordinance_doc_names || [];
      const newDocEntry = { url: file_url, name: file.name, uploaded_at: new Date().toISOString() };
      const updated = await base44.entities.TownConfig.update(townConfig.id, {
        ordinance_docs: [...existingDocs, file_url],
        ordinance_doc_names: [...existingNames, newDocEntry],
      });
      setTownConfig(updated);
      setUploadedDocNames(updated.ordinance_doc_names || []);
      setLastUploadedDoc(file.name);
      setTimeout(() => setLastUploadedDoc(null), 4000);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function removeDocument(index) {
    const newDocNames = (townConfig.ordinance_doc_names || []).filter((_, i) => i !== index);
    const newDocs = (townConfig.ordinance_docs || []).filter((_, i) => i !== index);
    const updated = await base44.entities.TownConfig.update(townConfig.id, {
      ordinance_docs: newDocs,
      ordinance_doc_names: newDocNames,
    });
    setTownConfig(updated);
    setUploadedDocNames(newDocNames);
  }

  async function askWithCase() {
    if (!selectedCase) return;
    const c = cases.find(ca => ca.id === selectedCase);
    if (!c) return;
    setInput(`Please analyze case ${c.case_number || c.id.slice(0, 8)} at ${c.property_address}. Does a violation exist? What specific RSA or local ordinance applies?`);
    setShowReviewWaitNotice(true);
  }

  function askWithZoningDetermination() {
    if (!selectedZoningDetermination) return;
    const z = zoningDeterminations.find((r) => r.id === selectedZoningDetermination);
    if (!z) return;
    setInput(
      `Please review zoning determination file ${z.file_number || z.id.slice(0, 8)} for ${z.property_address}. Using the request, site review notes, exhibits, and any draft determination on file, assess whether the reasoning is sound and cite the most relevant RSA sections and local ordinance provisions.`
    );
    setShowReviewWaitNotice(true);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-lg font-bold">{MERIDIAN_DISPLAY_NAME}</h1>
                <HelpTip title={`Using ${MERIDIAN_DISPLAY_NAME}`} align="start">
                  <p>
                    {MERIDIAN_DISPLAY_NAME} answers questions using NH land-use context, your <strong>town settings</strong> (if configured), and optional{' '}
                    <strong>ordinance PDFs</strong> you upload under Settings.
                  </p>
                  <p>
                    Use the <strong>Enforcement case</strong> or <strong>Zoning determination</strong> dropdown, then <strong>Analyze</strong>, to
                    load that matter into the chat so the assistant can review investigations, documents, and notes.
                  </p>
                  <p>
                    Attach a plan or photo with the paperclip when needed. Use <strong>New Chat</strong> to clear the thread. Admins can open{' '}
                    <strong>Settings</strong> to edit timelines, penalties, and training documents.
                  </p>
                </HelpTip>
              </div>
              <p className="text-xs text-muted-foreground">NH Land Use & Zoning Advisor {townConfig && <span> · {townConfig.town_name}</span>}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> New Chat</Button>
            {isAdmin && <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</Button>}
          </div>
        </div>

        {showConfig && isAdmin && (
          <div className="mx-auto mt-4 max-h-[min(70vh,28rem)] max-w-5xl overflow-y-auto overscroll-contain rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:max-h-[min(75vh,36rem)] md:max-h-[min(80vh,40rem)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-indigo-900">Town Configuration</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Town Name</Label><Input value={configForm.town_name} onChange={e => setConfigForm({...configForm, town_name: e.target.value})} required /></div>
                <div className="space-y-1"><Label className="text-xs">State</Label><Input value={configForm.state} onChange={e => setConfigForm({...configForm, state: e.target.value})} /></div>
                <div className="space-y-1"><Label className="text-xs">Penalty ($)</Label><Input type="number" value={configForm.penalty_first_offense} onChange={e => setConfigForm({...configForm, penalty_first_offense: +e.target.value})} /></div>
                <div className="space-y-1"><Label className="text-xs">ZBA Days</Label><Input type="number" value={configForm.zba_appeal_days} onChange={e => setConfigForm({...configForm, zba_appeal_days: +e.target.value})} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Regulations</Label><Textarea rows={3} value={configForm.specific_regulations} onChange={e => setConfigForm({...configForm, specific_regulations: e.target.value})} /></div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={savingConfig}>{savingConfig ? 'Saving...' : 'Save'}</Button>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent">
                   <Upload className="w-3 h-3" /> {uploadingDoc ? 'Uploading...' : 'Learn from PDF'}
                   <input type="file" className="hidden" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" onChange={handleDocUpload} />
                </label>
              </div>
            </form>
            {uploadedDocNames.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-indigo-200 pt-3">
                {uploadedDocNames.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-indigo-100 text-xs">
                    <span className="truncate flex items-center gap-2"><FileText className="w-3 h-3 text-indigo-500" />{doc.name || doc}</span>
                    <button onClick={() => removeDocument(i)} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <select value={selectedCase} onChange={(e) => setSelectedCase(e.target.value)} className="flex h-8 min-w-0 flex-1 text-xs rounded-md border border-input bg-transparent px-3 py-1 max-w-sm">
              <option value="">— Enforcement case —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number || 'Case'} — {c.property_address}
                </option>
              ))}
            </select>
            {selectedCase ? (
              <Button size="sm" variant="outline" onClick={askWithCase} className="h-8 shrink-0 text-xs">
                Analyze
              </Button>
            ) : null}
          </div>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <select
              value={selectedZoningDetermination}
              onChange={(e) => setSelectedZoningDetermination(e.target.value)}
              className="flex h-8 min-w-0 flex-1 text-xs rounded-md border border-input bg-transparent px-3 py-1 max-w-sm"
            >
              <option value="">— Zoning determination file —</option>
              {zoningDeterminations.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.file_number || 'ZD'} — {z.property_address}
                </option>
              ))}
            </select>
            {selectedZoningDetermination ? (
              <Button size="sm" variant="outline" onClick={askWithZoningDetermination} className="h-8 shrink-0 text-xs">
                Analyze
              </Button>
            ) : null}
          </div>
        </div>

        {showReviewWaitNotice && (
          <div className="relative mx-auto mt-3 max-w-5xl rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 pr-10 text-xs text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-50">
            <Info
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400"
              aria-hidden
            />
            <button
              type="button"
              className="absolute right-2 top-2 rounded-md p-0.5 text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900/60"
              onClick={() => setShowReviewWaitNotice(false)}
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pl-7 leading-relaxed">
              <span className="font-semibold text-sky-900 dark:text-sky-100">Reviews can take a little while.</span>{' '}
              {MERIDIAN_DISPLAY_NAME} keeps working in the background, so you can leave this page if you need to — when you come back here,
              your answer will appear in this chat.
            </p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 max-w-5xl mx-auto w-full space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-card border border-border'}`}>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                {msg.content.replace(/\s*\[Analyzing (?:case|zoning determination) ID:[^\]]+\]/g, '')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 py-4 space-y-2 [padding-bottom:max(1rem,env(safe-area-inset-bottom,0px))]">
        {planFile && (
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">Attached: {planFile.name}</span>
            <button type="button" className="text-red-600 hover:underline" onClick={() => { setPlanFile(null); if (planInputRef.current) planInputRef.current.value = ''; }}>Remove</button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto items-center">
          <label className="cursor-pointer shrink-0 p-2 rounded-md border border-input hover:bg-muted" title="Attach plan, PDF, or photo for this message">
            <Upload className="w-4 h-4" />
            <input
              ref={planInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
              onChange={(ev) => setPlanFile(ev.target.files?.[0] || null)}
            />
          </label>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask ${MERIDIAN_DISPLAY_NAME}… (optional: attach a plan)`} className="flex-1" disabled={sending} />
          <Button type="submit" disabled={sending || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

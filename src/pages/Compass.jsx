import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Upload, Loader2, RotateCcw, X, Info } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';
import { ZONING_DETERMINATIONS_ENABLED } from '@/lib/features';

export default function CompassPage() {
  const { user, municipality } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [docsSharedWithAgent, setDocsSharedWithAgent] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const planInputRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [zoningDeterminations, setZoningDeterminations] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedZoningDetermination, setSelectedZoningDetermination] = useState('');
  const [showReviewWaitNotice, setShowReviewWaitNotice] = useState(false);
  const messagesEndRef = useRef(null);

  // Persistent town-specific filtering for Super Admins
  useEffect(() => {
    async function loadCasesAndZoning() {
      const activeTownId = municipality?.id || user?.town_id;
      const townKey = activeTownId != null && activeTownId !== '' ? String(activeTownId) : '';
      try {
        if (townKey) {
          const [byRoot, byDataBag] = await Promise.all([
            base44.entities.Case.filter({ town_id: townKey }, '-created_date', 500).catch(() => []),
            base44.entities.Case.filter({ 'data.town_id': townKey }, '-created_date', 500).catch(() => []),
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
          if (ZONING_DETERMINATIONS_ENABLED) {
            const zd = await base44.entities.ZoningDetermination.filter(
              { town_id: townKey },
              '-created_date',
              150
            ).catch(() => []);
            setZoningDeterminations(zd || []);
          } else {
            setZoningDeterminations([]);
          }
          return;
        }
        if (user?.role === 'superadmin') {
          const c = await base44.entities.Case.list('-created_date', 2500);
          setCases((c || []).filter((ca) => !['resolved', 'closed'].includes(ca.status)));
          if (ZONING_DETERMINATIONS_ENABLED) {
            const zd = await base44.entities.ZoningDetermination.list('-created_date', 150).catch(() => []);
            setZoningDeterminations(zd || []);
          } else {
            setZoningDeterminations([]);
          }
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
            window.dispatchEvent(new Event('compass_new_conversation'));
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
      window.dispatchEvent(new Event('compass_new_conversation'));
    }
    initConversation();
  }, []);

  useEffect(() => {
    const handler = (e) => setMessages(e.detail.messages || []);
    window.addEventListener('compass_update', handler);
    return () => window.removeEventListener('compass_update', handler);
  }, []);

  /** Must subscribe here — CompassBackground only subscribes on app load; if the conversation is created after that (first visit / SPA), no subscription ran and the UI never updates until navigation. */
  useEffect(() => {
    if (!conversation?.id) return undefined;
    let unsubscribe;
    try {
      unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        const next = data.messages || [];
        setMessages(next);
        try {
          sessionStorage.setItem('compass_messages', JSON.stringify(next));
        } catch {
          /* ignore quota */
        }
      });
    } catch (err) {
      console.error('Meridian conversation subscription failed:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversation?.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  /** True while the model has not yet appended an assistant reply after the latest user message */
  const awaitingAssistantReply =
    messages.length > 0 && messages[messages.length - 1]?.role === 'user';

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
    window.dispatchEvent(new Event('compass_new_conversation'));
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending || awaitingAssistantReply) return;
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
    const ordinanceUrls = municipality?.ordinance_docs || [];
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
                    {MERIDIAN_DISPLAY_NAME} answers questions using NH land-use context, your <strong>town settings</strong> from{' '}
                    <strong>Admin → Municipality</strong>, and optional <strong>ordinance PDFs</strong> uploaded there.
                  </p>
                  <p>
                    Use the <strong>Enforcement case</strong>
                    {ZONING_DETERMINATIONS_ENABLED ? (
                      <>
                        {' '}
                        or <strong>Zoning determination</strong> dropdown, then <strong>Analyze</strong>, to load that matter into the chat so the
                        assistant can review investigations, documents, and notes.
                      </>
                    ) : (
                      <>
                        {' '}
                        dropdown, then <strong>Analyze</strong>, to load that matter into the chat so the assistant can review investigations,
                        documents, and notes. Zoning determination files are not available until that feature is enabled for your app.
                      </>
                    )}
                  </p>
                  <p>
                    Attach a plan or photo with the paperclip when needed. Use <strong>New Chat</strong> to clear the thread. Admins configure
                    deadlines, penalties, regulations, and training files under{' '}
                    <Link to="/admin" className="font-medium underline underline-offset-2">
                      Admin Tools → Municipality
                    </Link>
                    .
                  </p>
                </HelpTip>
              </div>
              <p className="text-xs text-muted-foreground">
                NH Land Use &amp; Zoning Advisor{municipality?.town_name ? ` · ${municipality.town_name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> New Chat</Button>
          </div>
        </div>

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
          {ZONING_DETERMINATIONS_ENABLED ? (
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
          ) : null}
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
        {awaitingAssistantReply && (
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground shrink-0" aria-label="Waiting for reply" />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 py-4 space-y-2 [padding-bottom:max(1rem,env(safe-area-inset-bottom,0px))]">
        {planFile && (
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-muted-foreground">
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
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${MERIDIAN_DISPLAY_NAME}… (optional: attach a plan)`}
            className="flex-1"
            disabled={sending || awaitingAssistantReply}
          />
          <Button type="submit" disabled={sending || awaitingAssistantReply || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

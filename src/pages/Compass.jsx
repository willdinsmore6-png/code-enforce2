import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Send, Upload, Settings, MessageSquare, Loader2, Building2, FileText, Plus, ChevronDown, ChevronUp, Trash2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

export default function CompassPage() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [townConfig, setTownConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ town_name: '', state: 'NH', compliance_days_zoning: 30, compliance_days_building: 30, zba_appeal_days: 30, penalty_first_offense: 275, penalty_subsequent: 550, specific_regulations: '', notes: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocNames, setUploadedDocNames] = useState([]);
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);
  const [docsSharedWithAgent, setDocsSharedWithAgent] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([
      base44.entities.TownConfig.filter({ is_active: true }),
      base44.entities.Case.list('-created_date', 100),
    ]).then(([configs, c]) => {
      if (configs[0]) {
        setTownConfig(configs[0]);
        setConfigForm(f => ({ ...f, ...configs[0] }));
        // Restore doc names from stored metadata
        setUploadedDocNames(configs[0].ordinance_doc_names || []);
      } else {
        setShowConfig(isAdmin);
      }
      setCases(c.filter(ca => !['resolved', 'closed'].includes(ca.status)));
    });
  }, []);

  useEffect(() => {
    async function initConversation() {
      const savedId = sessionStorage.getItem('compass_conversation_id');
      if (savedId) {
        try {
          const existing = await base44.agents.getConversation(savedId);
          if (existing?.id) {
            setConversation(existing);
            setMessages(existing.messages || []);
            // If this conversation already has messages, docs were already shared
            if (existing.messages?.length > 0) setDocsSharedWithAgent(true);
            return;
          }
        } catch (e) {
          // Conversation expired, create new one
        }
      }
      const conv = await base44.agents.createConversation({
        agent_name: 'compass',
        metadata: { name: 'Compass Session' },
      });
      sessionStorage.setItem('compass_conversation_id', conv.id);
      setConversation(conv);
      setMessages(conv.messages || []);
    }
    initConversation();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    const caseContext = selectedCase ? ` [Analyzing case ID: ${selectedCase}]` : '';
    const messagePayload = { role: 'user', content: msg + caseContext };
    // Only attach ordinance docs on the first message so the agent learns them once
    const docUrls = townConfig?.ordinance_docs || [];
    if (docUrls.length > 0 && !docsSharedWithAgent) {
      messagePayload.file_urls = docUrls;
      setDocsSharedWithAgent(true);
    }
    await base44.agents.addMessage(conversation, messagePayload);
    setSending(false);
  }

  async function saveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    if (townConfig?.id) {
      const updated = await base44.entities.TownConfig.update(townConfig.id, configForm);
      setTownConfig(updated);
    } else {
      const created = await base44.entities.TownConfig.create({ ...configForm, is_active: true });
      setTownConfig(created);
    }
    setSavingConfig(false);
    setShowConfig(false);
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!townConfig?.id) {
      alert('Please save the town configuration first before uploading documents.');
      return;
    }
    setUploadingDoc(true);
    setLastUploadedDoc(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingDocs = townConfig.ordinance_docs || [];
    const existingNames = townConfig.ordinance_doc_names || [];
    const newDocEntry = { url: file_url, name: file.name, uploaded_at: new Date().toISOString() };
    const updated = await base44.entities.TownConfig.update(townConfig.id, {
      ordinance_docs: [...existingDocs, file_url],
      ordinance_doc_names: [...existingNames, newDocEntry],
    });
    setTownConfig(updated);
    const newNames = [...existingNames, newDocEntry];
    setUploadedDocNames(newNames);
    setLastUploadedDoc(file.name);
    setTimeout(() => setLastUploadedDoc(null), 4000);
    setUploadingDoc(false);
  }

  async function removeDocument(index) {
    if (!townConfig?.id) return;
    const docNames = townConfig.ordinance_doc_names || [];
    const docs = townConfig.ordinance_docs || [];
    const newDocNames = docNames.filter((_, i) => i !== index);
    const newDocs = docs.filter((_, i) => i !== index);
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
    setInput(`Please analyze case ${c.case_number || c.id.slice(0, 8)} at ${c.property_address}. Review the investigation notes and any photos, then tell me: (1) Does a violation exist? (2) What specific RSA or local ordinance applies? (3) What is the recommended enforcement path given the current status of "${c.status.replace(/_/g, ' ')}"?`);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Compass AI</h1>
              <p className="text-xs text-muted-foreground">
                NH Land Use & Zoning Enforcement Advisor
                {townConfig && <span className="text-indigo-600 font-medium"> · {townConfig.town_name}, {townConfig.state}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {townConfig && (
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                <span>Zoning: {townConfig.compliance_days_zoning}d</span>
                <span>ZBA Appeal: {townConfig.zba_appeal_days}d</span>
                <span>Penalty: ${townConfig.penalty_first_offense}/day</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {uploadedDocNames.length > 0 ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium border border-green-200">
                      ✓ {uploadedDocNames.length} doc{uploadedDocNames.length !== 1 ? 's' : ''} learned
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200">
                      Unlearned
                    </span>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleDocUpload} />
                    <div className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent transition-colors">
                      {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingDoc ? 'AI Learning...' : 'AI Learning'}
                    </div>
                  </label>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  {townConfig ? 'Town Settings' : 'Setup Town'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Town Config Panel */}
        {showConfig && isAdmin && (
          <div className="mt-4 max-w-5xl mx-auto bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">Town Configuration — Train Compass AI</h3>
            </div>
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Town Name *</Label>
                  <Input value={configForm.town_name} onChange={e => setConfigForm(f => ({ ...f, town_name: e.target.value }))} required placeholder="Bow" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Input value={configForm.state} onChange={e => setConfigForm(f => ({ ...f, state: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zoning Compliance (days)</Label>
                  <Input type="number" value={configForm.compliance_days_zoning} onChange={e => setConfigForm(f => ({ ...f, compliance_days_zoning: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ZBA Appeal Window (days)</Label>
                  <Input type="number" value={configForm.zba_appeal_days} onChange={e => setConfigForm(f => ({ ...f, zba_appeal_days: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Offense Penalty/day</Label>
                  <Input type="number" value={configForm.penalty_first_offense} onChange={e => setConfigForm(f => ({ ...f, penalty_first_offense: +e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subsequent Penalty/day</Label>
                  <Input type="number" value={configForm.penalty_subsequent} onChange={e => setConfigForm(f => ({ ...f, penalty_subsequent: +e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Town-Specific Regulations (paste ordinance text for AI training)</Label>
                <Textarea rows={4} value={configForm.specific_regulations} onChange={e => setConfigForm(f => ({ ...f, specific_regulations: e.target.value }))} placeholder="Paste relevant zoning ordinance sections here — Compass will use this to give town-specific guidance..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Additional Notes</Label>
                <Input value={configForm.notes} onChange={e => setConfigForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Contact Town Counsel at..." />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="submit" disabled={savingConfig} size="sm">{savingConfig ? 'Saving...' : 'Save Configuration'}</Button>
                {townConfig?.id && (
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleDocUpload} />
                    <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent transition-colors">
                      {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingDoc ? 'Uploading...' : 'Upload Ordinance Doc'}
                    </div>
                  </label>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfig(false)}>Done</Button>
              </div>
            </form>

            {/* Learned Documents List */}
            {uploadedDocNames.length > 0 && (
              <div className="mt-4 border-t border-indigo-200 pt-4">
                <p className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Learned Documents ({uploadedDocNames.length})</p>
                <div className="space-y-1.5">
                  {uploadedDocNames.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{doc.name || doc}</span>
                        {doc.uploaded_at && <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(doc.uploaded_at).toLocaleDateString()}</span>}
                      </div>
                      <button onClick={() => removeDocument(i)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 ml-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload success toast */}
        {lastUploadedDoc && (
          <div className="mt-3 max-w-5xl mx-auto flex items-center gap-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{lastUploadedDoc}</strong> has been uploaded and Compass AI is now learning from it.</span>
          </div>
        )}

        {/* Case Selector for Analysis */}
        <div className="mt-3 max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
          <select
            value={selectedCase}
            onChange={e => setSelectedCase(e.target.value)}
            className="flex h-8 text-xs rounded-md border border-input bg-transparent px-3 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Analyze a specific case (optional) —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number || c.id.slice(0,8)} — {c.property_address?.slice(0, 40)}</option>
            ))}
          </select>
          {selectedCase && (
            <Button size="sm" variant="outline" onClick={askWithCase} className="h-8 text-xs gap-1">
              <MessageSquare className="w-3 h-3" /> Analyze This Case
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Compass className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Welcome to Compass AI</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              I'm your NH Land Use & Zoning Enforcement advisor. Ask me about RSA statutes, violation analysis, enforcement procedures, or select a case above for a full analysis.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {[
                'Does a junkyard violation require a warrant under RSA 595-B?',
                'What is the penalty for a first-offense zoning violation in NH?',
                'Walk me through Path A vs Path B enforcement',
                'What notice requirements apply under RSA 676:17-a?',
              ].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-left text-xs bg-muted hover:bg-muted/80 rounded-lg p-3 transition-colors border border-border">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (!msg.content && !msg.tool_calls?.length) return null;
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Compass className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-slate-800 text-white' : 'bg-card border border-border'}`}>
                {msg.content && (
                  isUser ? (
                    <p className="text-sm leading-relaxed">{msg.content.replace(/\s*\[Analyzing case ID:.*?\]/g, '')}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )
                )}
              </div>
            </div>
          );
        })}

        {(isLoading || sending) && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Compass className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 sm:px-6 py-4">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Compass about NH land use law, violations, enforcement procedures..."
            className="flex-1"
            disabled={sending || !conversation}
          />
          <Button type="submit" disabled={sending || !input.trim() || !conversation} size="icon">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
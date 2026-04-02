import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Send, Upload, Settings, MessageSquare, Loader2, Building2, FileText, Trash2, CheckCircle, RotateCcw, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

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
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
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

  useEffect(() => {
    async function loadCases() {
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;
      try {
        const c = await base44.entities.Case.filter({ town_id: activeTownId });
        setCases(c.filter(ca => !['resolved', 'closed'].includes(ca.status)));
      } catch (error) {
        console.error('Error loading cases:', error);
      }
    }
    loadCases();
  }, [municipality, user]);

  useEffect(() => {
    async function initConversation() {
      const savedId = sessionStorage.getItem('compass_conversation_id');
      const activeTownId = municipality?.id || user?.town_id;

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
          name: 'Compass Session',
          town_id: activeTownId 
        } 
      });
      sessionStorage.setItem('compass_conversation_id', conv.id);
      setConversation(conv);
      setMessages(conv.messages || []);
    }
    initConversation();
  }, [municipality, user]);

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
    
    const activeTownId = municipality?.id || user?.town_id;
    const conv = await base44.agents.createConversation({ 
      agent_name: 'compass', 
      metadata: { 
        name: 'Compass Session',
        town_id: activeTownId 
      } 
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
    const caseContext = selectedCase ? ` [Analyzing case ID: ${selectedCase}]` : '';
    const messagePayload = { role: 'user', content: msg + caseContext };
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
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Compass AI</h1>
              <p className="text-xs text-muted-foreground">NH Land Use & Zoning Advisor {townConfig && <span> · {townConfig.town_name}</span>}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> New Chat</Button>
            {isAdmin && <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</Button>}
          </div>
        </div>

        {showConfig && isAdmin && (
          <div className="mt-4 max-w-5xl mx-auto bg-indigo-50 border border-indigo-200 rounded-xl p-5">
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
                   <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleDocUpload} />
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

        <div className="mt-3 max-w-5xl mx-auto flex items-center gap-2">
          <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} className="flex h-8 text-xs rounded-md border border-input bg-transparent px-3 py-1 w-full max-w-sm">
            <option value="">— Analyze a specific case —</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.case_number || 'Case'} — {c.property_address}</option>)}
          </select>
          {selectedCase && <Button size="sm" variant="outline" onClick={askWithCase} className="h-8 text-xs">Analyze</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-card border border-border'}`}>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none">{msg.content.replace(/\s*\[Analyzing case ID:.*?\]/g, '')}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </div>
              <span className="text-sm text-indigo-700 font-medium">
                Compass is searching case files...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-4">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder={isLoading ? "Compass is thinking..." : "Ask Compass..."} 
            className="flex-1" 
            disabled={sending || isLoading} 
          />
          <Button type="submit" disabled={sending || isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Compass, Send, Upload, Settings, Loader2, Building2, 
  FileText, Trash2, RotateCcw, X, AlertCircle, FileWarning 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

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
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (municipality) {
      setTownConfig(municipality);
      setConfigForm(f => ({ ...f, ...municipality }));
      setUploadedDocNames(municipality.ordinance_doc_names || []);
    } else { setShowConfig(isAdmin); }
  }, [municipality, isAdmin]);

  useEffect(() => {
    async function init() {
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;
      const [cList, conv] = await Promise.all([
        base44.entities.Case.filter({ town_id: activeTownId }),
        base44.agents.createConversation({ 
          agent_name: 'compass', 
          metadata: { town_id: activeTownId } 
        })
      ]);
      setCases(cList.filter(ca => !['resolved', 'closed'].includes(ca.status)));
      setConversation(conv);
    }
    init();
  }, [municipality, user]);

  useEffect(() => {
    const handler = (e) => setMessages(e.detail.messages || []);
    window.addEventListener('compass_update', handler);
    return () => window.removeEventListener('compass_update', handler);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file || !townConfig?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds 10MB limit for AI analysis.");
      return;
    }
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = await base44.entities.TownConfig.update(townConfig.id, {
        ordinance_docs: [...(townConfig.ordinance_docs || []), file_url],
        ordinance_doc_names: [...(townConfig.ordinance_doc_names || []), { name: file.name, url: file_url }]
      });
      setTownConfig(updated);
      setUploadedDocNames(updated.ordinance_doc_names || []);
    } finally { setUploadingDoc(false); }
  }

  async function saveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const updated = await base44.entities.TownConfig.update(townConfig.id, configForm);
      setTownConfig(updated);
      setShowConfig(false);
    } finally { setSavingConfig(false); }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    const payload = { 
      role: 'user', 
      content: selectedCase ? `${msg} [SYSTEM: Analyze Case ID ${selectedCase} and read all attachments.]` : msg 
    };

    if (selectedCase) {
      const docs = await base44.entities.Document.filter({ case_id: selectedCase });
      payload.file_urls = docs.filter(d => (d.size || 0) < 10485760).map(d => d.url || d.file_url);
    }

    await base44.agents.addMessage(conversation, payload);
    setSending(false);
  }

  async function deepEvaluate() {
    if (!selectedCase) return;
    const c = cases.find(ca => ca.id === selectedCase);
    setInput(`Deep Evaluation: ${c.property_address}. [SYSTEM: Read every PDF/photo attached to this case to identify Bow zoning violations.]`);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      <div className="flex-shrink-0 border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Compass AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Bow Enforcement Advisor</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}><RotateCcw className="w-4 h-4" /></Button>
            {isAdmin && <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}><Settings className="w-4 h-4" /></Button>}
          </div>
        </div>

        {showConfig && isAdmin && (
          <div className="mt-4 max-w-5xl mx-auto p-5 bg-indigo-50 border border-indigo-200 rounded-xl animate-in slide-in-from-top-2">
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="flex items-center justify-between mb-2 text-indigo-900 font-bold text-sm">
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Town Configuration & ZBA Rules</span>
                <Button type="submit" size="sm" disabled={savingConfig}>{savingConfig ? 'Saving...' : 'Save Changes'}</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Zoning Comp (Days)</Label><Input type="number" value={configForm.compliance_days_zoning} onChange={e => setConfigForm({...configForm, compliance_days_zoning: +e.target.value})} className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">ZBA Appeal (Days)</Label><Input type="number" value={configForm.zba_appeal_days} onChange={e => setConfigForm({...configForm, zba_appeal_days: +e.target.value})} className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Penalty ($)</Label><Input type="number" value={configForm.penalty_first_offense} onChange={e => setConfigForm({...configForm, penalty_first_offense: +e.target.value})} className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Teach Ordinance</Label>
                  <label className="flex items-center justify-center h-8 border border-dashed border-indigo-400 rounded bg-white hover:bg-indigo-100 cursor-pointer text-[10px] font-bold text-indigo-600">
                    <Upload className="w-3 h-3 mr-1" /> {uploadingDoc ? '...' : 'Upload PDF'}
                    <input type="file" className="hidden" accept=".pdf" onChange={handleDocUpload} />
                  </label>
                </div>
              </div>
              {uploadedDocNames.length > 0 && (
                <div className="space-y-1 bg-white p-2 rounded border border-indigo-100 max-h-20 overflow-y-auto mt-2">
                  {uploadedDocNames.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1">
                      <span className="truncate flex items-center gap-2"><FileText className="w-3 h-3" /> {doc.name}</span>
                      <button type="button" onClick={() => removeDocument(i)} className="text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}

        <div className="mt-4 max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} className="flex h-9 text-sm rounded-md border border-input bg-background px-3 w-full max-w-sm">
              <option value="">— Select a case —</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number || 'Case'} — {c.property_address}</option>)}
            </select>
            {selectedCase && <Button size="sm" onClick={deepEvaluate} className="bg-indigo-600">Analyze Case Files</Button>}
          </div>

          {isLoading ? (
            <Alert className="bg-amber-50 border-amber-200 py-2 animate-pulse">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-700 font-bold uppercase">
                Analysis in Progress. Please be patient. It is safe to navigate away. Files over 10MB are excluded.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1 italic">
              <FileWarning className="w-3 h-3" /> Case files and ordinances must be under 10MB for AI processing.
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-card border shadow-sm'}`}>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none">{msg.content.replace(/\[SYSTEM:.*?\]/g, '')}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-indigo-600 font-bold animate-pulse text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Compass is evaluating your ordinances and case documents...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-card shadow-lg">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Compass..." disabled={isLoading} />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-indigo-600"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

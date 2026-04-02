import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Send, Upload, Settings, Loader2, Building2, FileText, Trash2, RotateCcw, X, AlertCircle } from 'lucide-react';
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
            return;
          }
        } catch (e) {
          sessionStorage.removeItem('compass_conversation_id');
        }
      }
      
      const conv = await base44.agents.createConversation({ 
        agent_name: 'compass', 
        metadata: { town_id: activeTownId } 
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
    
    const activeTownId = municipality?.id || user?.town_id;
    const conv = await base44.agents.createConversation({ 
      agent_name: 'compass', 
      metadata: { town_id: activeTownId } 
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
    await base44.agents.addMessage(conversation, { role: 'user', content: msg + caseContext });
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
    } catch (err) { console.error(err); } finally { setSavingConfig(false); }
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
    } finally { setUploadingDoc(false); }
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
    setInput(`Analyze case ${c.case_number || c.id.slice(0, 8)} at ${c.property_address}. Open and read ALL documents and pictures attached to this case.`);
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
              <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                <Building2 className="w-4 h-4" /> Town Configuration
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
          </div>
        )}

        <div className="mt-3 max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} className="flex h-8 text-xs rounded-md border border-input bg-transparent px-3 py-1 w-full max-w-sm">
              <option value="">— Analyze a specific case —</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number || 'Case'} — {c.property_address}</option>)}
            </select>
            {selectedCase && <Button size="sm" variant="outline" onClick={askWithCase} className="h-8 text-xs">Analyze Case Attachments</Button>}
          </div>

          {isLoading && (
            <Alert className="bg-amber-50 border-amber-200 py-2 animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold text-amber-800 uppercase tracking-wider">Analysis in Progress</AlertTitle>
              <AlertDescription className="text-xs text-amber-700 leading-relaxed">
                Answers can take some time so please be patient. It is okay to navigate away from the page; your conversation is automatically saved and will continue in the background.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-5xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-slate-800 text-white shadow-sm' : 'bg-card border border-border shadow-sm'}`}>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none">{msg.content.replace(/\s*\[Analyzing case ID:.*?\]/g, '')}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </div>
              <span className="text-sm text-indigo-700 font-medium">Compass is opening attachments...</span>
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
            placeholder={isLoading ? "Processing files..." : "Ask Compass..."} 
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
}

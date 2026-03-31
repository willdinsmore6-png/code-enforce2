import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Compass, 
  Send, 
  Upload, 
  Settings, 
  MessageSquare, 
  Loader2, 
  Building2, 
  FileText, 
  Trash2, 
  CheckCircle, 
  RotateCcw,
  Sparkles,
  Gavel,
  ShieldCheck,
  ChevronRight,
  Plus,
  Info,
  X,
  Search
} from 'lucide-react';
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
    town_name: '', state: 'NH', compliance_days_zoning: 30, compliance_days_building: 30, 
    zba_appeal_days: 30, penalty_first_offense: 275, penalty_subsequent: 550, 
    specific_regulations: '', notes: '' 
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocNames, setUploadedDocNames] = useState([]);
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
    base44.entities.Case.list('-created_date', 100).then(c => {
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
            const cached = sessionStorage.getItem('compass_messages');
            if (cached) {
              try { setMessages(JSON.parse(cached)); } catch (e) { setMessages(existing.messages || []); }
            } else {
              setMessages(existing.messages || []);
            }
            if (existing.messages?.length > 0) setDocsSharedWithAgent(true);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem('compass_conversation_id');
          sessionStorage.removeItem('compass_messages');
        }
      }
      const conv = await base44.agents.createConversation({
        agent_name: 'compass',
        metadata: { name: 'Compass Session' },
      });
      sessionStorage.setItem('compass_conversation_id', conv.id);
      sessionStorage.removeItem('compass_messages');
      setConversation(conv);
      setMessages(conv.messages || []);
      window.dispatchEvent(new CustomEvent('compass_new_conversation'));
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
    if (!window.confirm("Start a fresh legal consultation? Previous messages in this session will be cleared.")) return;
    sessionStorage.removeItem('compass_conversation_id');
    sessionStorage.removeItem('compass_messages');
    setConversation(null);
    setMessages([]);
    setDocsSharedWithAgent(false);
    const conv = await base44.agents.createConversation({ agent_name: 'compass', metadata: { name: 'Compass Session' } });
    sessionStorage.setItem('compass_conversation_id', conv.id);
    setConversation(conv);
    window.dispatchEvent(new CustomEvent('compass_new_conversation'));
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    const caseContext = selectedCase ? ` [Context: Analyzing case file for ${cases.find(c => c.id === selectedCase)?.property_address}]` : '';
    const messagePayload = { role: 'user', content: msg + caseContext };
    
    const docUrls = townConfig?.ordinance_docs || [];
    if (docUrls.length > 0 && !docsSharedWithAgent) {
      messagePayload.file_urls = docUrls;
      setDocsSharedWithAgent(true);
    }
    await base44.agents.addMessage(conversation, messagePayload);
    setSending(false);
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingDocs = townConfig.ordinance_docs || [];
    const existingNames = townConfig.ordinance_doc_names || [];
    const newDocEntry = { url: file_url, name: file.name, uploaded_at: new Date().toISOString() };
    const updated = await base44.entities.TownConfig.update(townConfig.id, {
      ordinance_docs: [...existingDocs, file_url],
      ordinance_doc_names: [...existingNames, newDocEntry],
    });
    setTownConfig(updated);
    setUploadedDocNames([...existingNames, newDocEntry]);
    setUploadingDoc(false);
  }

  const isThinking = sending || (messages.length > 0 && messages[messages.length - 1].role === 'user');

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* --- PREMIUM HEADER --- */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Compass AI</h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Statutory Guidance Agent</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={startNewChat} className="rounded-xl font-bold gap-2 text-slate-600">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Chat
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="rounded-xl font-bold gap-2">
                <Settings className="w-3.5 h-3.5" /> Town Rules
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* --- MAIN CHAT AREA --- */}
        <main className="flex-1 flex flex-col bg-white relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 animate-in fade-in duration-1000">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">How can I assist your enforcement today?</h2>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        I have access to {municipality?.town_name}'s specific regulations and New Hampshire RSAs. Ask me about a case, a statute, or procedural next steps.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full">
                    <Button variant="ghost" onClick={() => setInput("What are the daily penalty limits under RSA 676:17?")} className="text-xs justify-start hover:bg-slate-50 border border-slate-100 rounded-xl py-6 px-4">
                        "What are the daily penalty limits under RSA 676:17?"
                    </Button>
                    <Button variant="ghost" onClick={() => setInput("Generate a draft checklist for a junk vehicle investigation.")} className="text-xs justify-start hover:bg-slate-50 border border-slate-100 rounded-xl py-6 px-4">
                        "Draft a checklist for a junk vehicle investigation."
                    </Button>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] rounded-3xl p-5 ${
                  m.role === 'user' 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                  : 'bg-slate-50 border border-slate-100 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2 opacity-50">
                    {m.role === 'user' ? <User className="w-3 h-3" /> : <Compass className="w-3 h-3" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.role === 'user' ? 'Officer' : 'Compass Agent'}</span>
                  </div>
                  <div className="prose prose-sm max-w-none prose-slate leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analyzing Regulations...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* --- STICKY INPUT BAR --- */}
          <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            <form onSubmit={sendMessage} className="flex gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-primary transition-all">
                <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedCase ? "Ask about this case..." : "Ask a legal or procedural question..."}
                    className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-md h-12"
                />
                <Button type="submit" disabled={isThinking || !input.trim()} className="h-12 w-12 rounded-xl shadow-lg shadow-primary/20">
                    <Send className="w-5 h-5" />
                </Button>
            </form>
            <div className="flex items-center gap-4 mt-3 px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Encrypted Town Data
                </p>
                {docsSharedWithAgent && (
                    <p className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Local Ordinances Linked
                    </p>
                )}
            </div>
          </div>
        </main>

        {/* --- CONTEXT SIDEBAR --- */}
        <aside className="w-80 border-l border-slate-100 bg-slate-50/50 hidden lg:block overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Gavel className="w-4 h-4" /> Active Case Focus
                </h3>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <Select value={selectedCase} onValueChange={setSelectedCase}>
                        <SelectTrigger className="bg-slate-50 border-none h-10 text-xs font-bold rounded-xl">
                            <SelectValue placeholder="Select a case..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No case selected</SelectItem>
                            {cases.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.property_address}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedCase && selectedCase !== 'none' && (
                        <Button variant="default" size="sm" onClick={askWithCase} className="w-full text-[10px] font-black uppercase tracking-widest py-5 rounded-xl">
                            Analyze Selected Case
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Knowledge Base
                    </h3>
                    <label className="cursor-pointer group">
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                        <input type="file" className="hidden" onChange={handleDocUpload} />
                    </label>
                </div>
                <div className="space-y-2">
                    {uploadedDocNames.map((doc, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-bold text-slate-600 truncate">{doc.name}</span>
                            </div>
                            <button onClick={() => removeDocument(idx)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {uploadedDocNames.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">No Local Laws Uploaded</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-2 mb-2 text-primary">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Accuracy</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    Compass uses RAG (Retrieval-Augmented Generation) to prioritize your town's uploaded documents over general knowledge.
                </p>
            </div>
        </aside>
      </div>

      {/* Town Config Modal (Internal Settings) */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[40px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" /> Town Statutory Rules
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowConfig(false)}><X className="w-6 h-6" /></Button>
                </div>
                
                <form onSubmit={saveConfig} className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-400">Town Name</Label>
                        <Input value={configForm.town_name} onChange={e => setConfigForm({...configForm, town_name: e.target.value})} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-400">Abatement Days</Label>
                        <Input type="number" value={configForm.compliance_days_zoning} onChange={e => setConfigForm({...configForm, compliance_days_zoning: e.target.value})} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-400">Penalty Rate ($)</Label>
                        <Input type="number" value={configForm.penalty_first_offense} onChange={e => setConfigForm({...configForm, penalty_first_offense: e.target.value})} className="h-12 rounded-xl" />
                    </div>
                    <div className="col-span-2 pt-6 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setShowConfig(false)} className="font-bold">Cancel</Button>
                        <Button type="submit" disabled={savingConfig} className="px-10 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Rules"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

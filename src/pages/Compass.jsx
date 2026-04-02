import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Send, Loader2, Building2, RotateCcw, X, AlertCircle, Settings, FileText, Trash2, Upload } from 'lucide-react';
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
  const [configForm, setConfigForm] = useState({ town_name: '', state: 'NH', penalty_first_offense: 275, penalty_subsequent: 550 });
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (municipality) {
      setTownConfig(municipality);
      setConfigForm(f => ({ ...f, ...municipality }));
    }
  }, [municipality]);

  useEffect(() => {
    async function loadData() {
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;
      const [cList, conv] = await Promise.all([
        base44.entities.Case.filter({ town_id: activeTownId }),
        base44.agents.createConversation({ agent_name: 'compass', metadata: { town_id: activeTownId } })
      ]);
      setCases(cList.filter(ca => ca.status !== 'closed'));
      setConversation(conv);
    }
    loadData();
  }, [municipality, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    const payload = { 
      role: 'user', 
      content: selectedCase ? `${msg} [SYSTEM: Read all Documents for Case ID ${selectedCase} now.]` : msg 
    };

    if (selectedCase) {
      const docs = await base44.entities.Document.filter({ case_id: selectedCase });
      payload.file_urls = docs.filter(d => (d.size || 0) < 10485760).map(d => d.url || d.file_url);
    }

    await base44.agents.addMessage(conversation, payload);
    setSending(false);
  }

  async function startDeepAnalysis() {
    if (!selectedCase) return;
    const c = cases.find(ca => ca.id === selectedCase);
    setInput(`Evaluate Case ${c.case_number} at ${c.property_address}. [SYSTEM: You are required to list and read EVERY PDF and photo attached to this case ID. Identify if a violation of Bow ordinances or NH RSA Title LXIV exists.]`);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      <div className="flex-shrink-0 border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Compass AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bow Enforcement Advisor</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}><RotateCcw className="w-4 h-4" /></Button>
            {isAdmin && <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}><Settings className="w-4 h-4" /></Button>}
          </div>
        </div>

        {showConfig && (
          <div className="mt-4 max-w-5xl mx-auto p-4 bg-indigo-50 border border-indigo-100 rounded-lg animate-in slide-in-from-top-2">
             <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Town Settings</h3>
             <div className="grid grid-cols-2 gap-4 text-xs">
                <div><Label>First Penalty ($)</Label><Input value={configForm.penalty_first_offense} readOnly /></div>
                <div><Label>Subsequent ($)</Label><Input value={configForm.penalty_subsequent} readOnly /></div>
             </div>
          </div>
        )}

        <div className="mt-4 max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} className="flex h-9 text-sm rounded-md border border-input bg-background px-3 w-full max-w-sm">
              <option value="">— Select a case to evaluate —</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number || 'Case'} — {c.property_address}</option>)}
            </select>
            {selectedCase && <Button size="sm" onClick={startDeepAnalysis} className="bg-indigo-600 hover:bg-indigo-700">Deep Evaluation</Button>}
          </div>

          {isLoading && (
            <Alert className="bg-amber-50 border-amber-200 py-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-700 font-medium">
                Deep analysis of PDFs and photos takes time. Please be patient. It is safe to navigate away; your results are saved automatically.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : 'bg-card border shadow-sm'}`}>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-headings:text-indigo-900">
                {msg.content.replace(/\[SYSTEM:.*?\]/g, '')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-indigo-600 font-medium animate-pulse text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Compass is opening attached files...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-card shadow-lg">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Compass..." disabled={isLoading} className="bg-background" />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-indigo-600"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

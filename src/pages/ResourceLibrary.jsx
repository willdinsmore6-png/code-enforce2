import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

export default function ResourceLibrary() {
  const { user, municipality } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [showAI, setShowAI] = useState(false);
  
  // Established Town ID mapping for security rules
  const currentTownId = municipality?.id || user?.town_id || user?.municipality_id;
  const townName = municipality?.town_name || municipality?.name || "Local Municipality";
  const state = municipality?.state || "NH";
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (currentTownId) loadResources();
  }, [currentTownId]);

  async function loadResources() {
    setLoading(true);
    try {
      // Filtering by town_id as required by the Base44 security layer
      const existing = await base44.entities.Resource.filter({ 
        town_id: currentTownId 
      });
      setResources(existing);
    } catch (err) { 
      console.error("Library Sync Error:", err); 
    } finally {
      setLoading(false);
    }
  }

  const toggleItem = (key) => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const grouped = resources
    .filter(r => !searchTerm || r.term?.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, r) => {
      const cat = r.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <section>
        <BuildingCodeLookup townName={townName} state={state} townId={currentTownId} />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight uppercase">Resource Library</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Active Jurisdiction: {townName}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setShowAI(!showAI)} variant="outline" size="sm" className="gap-2 text-[10px] font-bold bg-slate-900 text-white uppercase shadow-sm hover:bg-slate-800">
              <Sparkles className="w-3 h-3 text-amber-500" /> {showAI ? "Close Curator" : "Open AI Curator"}
            </Button>
          )}
        </div>
      </div>

      {showAI && (
        <AICuratePanel 
          onClose={() => { setShowAI(false); loadResources(); }} 
          townId={currentTownId}
          townName={townName}
          state={state}
        />
      )}

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Live Vault</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Filter records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-xs bg-white border-slate-200" />
            </div>
            <Button onClick={loadResources} variant="ghost" size="sm" className="h-8 w-8 p-0">
               <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {resources.length === 0 && !loading && (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl font-mono text-slate-400 uppercase text-xs tracking-widest">
             No accessible records found for this ID
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1 text-left font-mono">{category}</p>
              <div className="grid gap-2">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm text-left hover:border-slate-300 transition-all">
                    <button onClick={() => toggleItem(item.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-semibold text-slate-700">{item.term}</span>
                      {expandedItems[item.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {expandedItems[item.id] && (
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 font-mono">
                        <div className="text-sm text-slate-600 leading-relaxed py-2"><ReactMarkdown>{item.definition}</ReactMarkdown></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AICuratePanel({ onClose, townId, townName, state }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.agents.createConversation({ agent_name: 'resource_curator', metadata: { town_id: townId } })
      .then(conv => { setConversation(conv); setMessages(conv.messages || []); });
  }, [townId]);

  useEffect(() => {
    if (!conversation) return;
    return base44.agents.subscribeToConversation(conversation.id, data => setMessages(data.messages || []));
  }, [conversation?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(e, customMsg = null) {
    if (e) e.preventDefault();
    const msg = customMsg || input.trim();
    if (!msg || !conversation || sending) return;
    
    if (!customMsg) setInput('');
    setSending(true);

    const prompt = `
      SECURITY REQUIREMENT: You MUST set the field 'town_id' to "${townId}" on every Resource you create or update.
      Failure to do so will block the record from being visible.
      
      COMMAND: ${msg}
    `;

    await base44.agents.addMessage(conversation, { role: 'user', content: prompt });
    setSending(false);
  }

  const handleAutoCurate = () => {
    sendMessage(null, `Initiate full jurisdictional review for ${townName}, ${state}. Identify 12+ technical resources and create them using town_id.`);
  };

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white font-mono text-[10px]">
        <span className="font-bold uppercase tracking-widest">Registrar Curator Sync</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleAutoCurate} className="h-6 text-[9px] bg-amber-500/10 text-amber-500 gap-1 border border-amber-500/20 hover:bg-amber-500/20">
            <RefreshCw className={`w-2.5 h-2.5 ${sending ? 'animate-spin' : ''}`} /> Auto-Sync
          </Button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 bg-slate-50 font-mono text-[10px] text-left">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-600' : 'text-slate-700'}`}>
            <span className="font-bold">{msg.role === 'user' ? '> AUDIT: ' : '>> RESPONSE: '}</span>
            <div className="inline ml-1"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Sync instructions..." className="flex-1 h-9 text-xs font-mono border-slate-200 focus:ring-slate-900" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4 uppercase text-[10px] font-bold" disabled={sending}>Execute</Button>
      </form>
    </div>
  );
}

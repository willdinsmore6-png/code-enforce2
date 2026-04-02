import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function ResourceLibrary() {
  const { user, municipality } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [showAI, setShowAI] = useState(false);
  
  const currentTownId = municipality?.id || user?.municipality_id;
  const townName = municipality?.town_name || municipality?.name || "Local Municipality";
  const state = municipality?.state || "NH";
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (currentTownId) loadResources();
  }, [currentTownId]);

  async function loadResources() {
    setLoading(true);
    try {
      const existing = await base44.entities.Resource.filter({ 
        municipality_id: currentTownId,
        is_active: true 
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
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* 1. PLAN REVIEW TOOL (Absolute Top) */}
      <section>
        <BuildingCodeLookup 
          townName={townName} 
          state={state} 
          townId={currentTownId} 
        />
      </section>

      {/* 2. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight uppercase">Resource Library</h1>
          <p className="text-sm text-slate-500 font-medium">Jurisdiction: {townName}, {state}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAI(!showAI)} variant="outline" className="gap-2 text-xs h-9 border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 
            {showAI ? "Close Curator" : "Open AI Curator"}
          </Button>
        )}
      </div>

      {/* 3. AI CURATOR (With Force-Write Prompt) */}
      {showAI && (
        <AICuratePanel 
          onClose={() => { setShowAI(false); loadResources(); }} 
          townId={currentTownId}
          townName={townName}
          state={state}
        />
      )}

      {/* 4. REFERENCE LIST */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Database Records</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-xs bg-white border-slate-200" />
            </div>
            <Button onClick={loadResources} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Sync with database">
               <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1 text-left font-mono">{category}</p>
                <div className="grid gap-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <button onClick={() => toggleItem(item.id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-semibold text-slate-700">{item.term}</span>
                        {expandedItems[item.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {expandedItems[item.id] && (
                        <div className="px-5 pb-5 pt-1 space-y-4 text-left border-t border-slate-50">
                          <div className="text-sm text-slate-600 leading-relaxed font-mono whitespace-pre-wrap py-2">
                            <ReactMarkdown>{item.definition}</ReactMarkdown>
                          </div>
                          {item.tip && (
                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 font-mono">Registrar Field Note</p>
                              <p className="text-xs text-amber-900/80 leading-snug">{item.tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 font-mono italic">No records found for this jurisdiction. Run Curator to populate.</p>
              </div>
            )}
          </div>
        )}
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

    // THE SYNC AUDIT: Explicitly mapping the database fields for the AI
    const constraint = `
      COMMAND: Use your Resource Entity Tool to CREATE records.
      REQUIRED FIELDS:
      - term: (The word/RSA)
      - definition: (Technical explanation)
      - category: (State Statutes, Local Zoning, or Technical Terms)
      - municipality_id: "${townId}" (CRITICAL: Do not use town_id or name)
      - state: "${state}"
      - is_active: true
      
      CONTEXT: ${msg}
    `;

    await base44.agents.addMessage(conversation, { 
      role: 'user', 
      content: constraint 
    });
    setSending(false);
  }

  const handleAutoCurate = () => {
    const prompt = `Perform a Registrar-level jurisdictional audit for ${townName}, ${state}. Identify 10+ technical definitions from ${state} statutes and local ordinances. Save them as new Resource records using your Entity Tool now.`;
    sendMessage(null, prompt);
  };

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-[10px] uppercase tracking-widest font-mono">Registrar Curator</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleAutoCurate} className="h-7 text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 gap-1 border border-amber-500/20">
            <RefreshCw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} /> Auto-Curate
          </Button>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 bg-slate-50 font-mono text-[10px] text-left">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-600' : 'text-slate-700'}`}>
            <span className="font-bold uppercase tracking-tighter">{msg.role === 'user' ? '> AUDIT: ' : '>> SYNC: '}</span>
            <div className="inline leading-relaxed ml-1"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Curate library..." className="flex-1 h-9 text-xs font-mono" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4 uppercase text-[10px] font-bold" disabled={sending}>
           {sending ? "Syncing..." : "Execute"}
        </Button>
      </form>
    </div>
  );
}

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
  
  const currentTownId = municipality?.id || user?.municipality_id;
  const townName = municipality?.town_name || municipality?.name || "Local Municipality";
  const state = municipality?.state || "State"; // Dynamic State Anchor
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
    } catch (err) { console.error(err); }
    setLoading(false);
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
      
      {/* 1. UNIVERSAL CODE LOOKUP */}
      <section>
        <BuildingCodeLookup 
          townName={townName} 
          state={state} 
          townId={currentTownId} 
        />
      </section>

      {/* 2. DYNAMIC HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">Resource Library</h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-tight">
            Jurisdiction: {townName}, {state}
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setShowAI(!showAI)} 
            variant="outline"
            className="gap-2 text-xs h-9 border-slate-200 hover:bg-slate-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 
            {showAI ? "Close Curator" : "Open AI Curator"}
          </Button>
        )}
      </div>

      {/* 3. AI CURATOR PANEL (STATE-AGNOSTIC) */}
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
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Statute & Term Archive</h2>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search local or state terms..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-9 h-8 text-xs bg-white border-slate-200" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1 text-left">
                  {category}
                </p>
                <div className="grid gap-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleItem(item.id)} 
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-slate-700">{item.term}</span>
                        {expandedItems[item.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {expandedItems[item.id] && (
                        <div className="px-5 pb-5 pt-1 space-y-4 text-left border-t border-slate-50">
                          <p className="text-sm text-slate-600 leading-relaxed font-mono whitespace-pre-wrap">{item.definition}</p>
                          {item.tip && (
                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Registrar Field Note</p>
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

    await base44.agents.addMessage(conversation, { 
      role: 'user', 
      content: `${msg} \n\n(AUTHORITY: You are The Registrar. Current Jurisdiction: ${townName}, ${state}. Only curate resources valid for this specific state's Building Codes and Land Use Statutes.)` 
    });
    setSending(false);
  }

  const handleAutoCurate = () => {
    const prompt = `
      Perform a professional "Registrar-Level" jurisdictional audit for ${townName}, ${state}.
      1. STATE COMPLIANCE: Identify and link specific ${state} State Statutes governing land use, building code adoption (e.g., FBC, CBC, IBC), and administrative warrants.
      2. MUNICIPAL SYNC: Cross-reference internal town documents in the vault to identify local zoning trends.
      3. EXPANDED TERMS: Generate a list of at least 12 technical terms specific to ${state} land-use law.
      4. NO-FLUFF DEFINITIONS: All content must be technical, professional, and ready for use in formal citations.
    `;
    sendMessage(null, prompt);
  };

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2 text-left">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-[10px] uppercase tracking-widest leading-none">Registrar Curator: {townName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAutoCurate} 
            className="h-7 text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 gap-1 border border-amber-500/20"
          >
            <RefreshCw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} /> Auto-Curate
          </Button>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 bg-slate-50 font-mono text-[10px] text-left">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-600' : 'text-slate-700'}`}>
            <span className="font-bold uppercase tracking-tighter">{msg.role === 'user' ? '> AUDIT INITIATED: ' : '>> REGISTRAR UPDATE: '}</span>
            <ReactMarkdown className="inline leading-relaxed">{msg.content}</ReactMarkdown>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Command curator for ${townName}...`} className="flex-1 h-9 text-xs" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4 uppercase text-[10px] font-bold">Execute</Button>
      </form>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
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
  const townName = municipality?.town_name || municipality?.name || "Bow";
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* 1. Page Header */}
      <PageHeader
        title="Resource Library"
        description="Plan Reviewer and Technical Reference Suite"
        actions={
          isAdmin && (
            <Button onClick={() => setShowAI(true)} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
              <Sparkles className="w-4 h-4 text-amber-400" /> Open AI Curator
            </Button>
          )
        }
      />

      {/* 2. THE HERO: Building Code Lookup (Now at the Top) */}
      <section>
        <BuildingCodeLookup 
          townName={townName} 
          state={municipality?.state || "NH"} 
          townId={currentTownId} 
        />
      </section>

      <hr className="border-slate-200" />

      {/* 3. AI Curator Panel (Conditional) */}
      {showAI && (
        <AICuratePanel 
          onClose={() => { setShowAI(false); loadResources(); }} 
          townId={currentTownId}
          townName={townName}
        />
      )}

      {/* 4. Searchable Library */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Municipal Reference Library</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search library..." 
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> {category}
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
                          <p className="text-sm text-slate-600 leading-relaxed font-mono">{item.definition}</p>
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

/** * AI CURATOR PANEL COMPONENT
 */
function AICuratePanel({ onClose, townId, townName }) {
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
      content: `${msg} \n\n(CONSTRAINT: Only curate resources for ${townName} [ID: ${townId}])` 
    });
    setSending(false);
  }

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-[10px] uppercase tracking-widest tracking-tighter">AI Resource Curator: {townName}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50 font-mono text-[11px] text-left">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <ReactMarkdown className="prose prose-xs">{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 px-4 py-4 border-t bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="E.g., 'Update my setbacks for Bow...'" className="flex-1 h-9 text-xs border-slate-200" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4"><Send className="w-3.5 h-3.5 mr-2" /> Send</Button>
      </form>
    </div>
  );
}

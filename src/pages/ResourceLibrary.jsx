import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

// Default NH resources to seed only for the specific active municipality
const DEFAULT_RESOURCES = [
  { category: 'Key Statutes', term: 'RSA 676:15 — Injunctive Relief', definition: 'Allows a municipality to seek a court injunction in Superior Court to stop a land use violation and require abatement (cleanup).', tip: 'Use this for serious violations where a court order is needed to compel compliance.', sort_order: 1 },
  { category: 'Key Statutes', term: 'RSA 676:17 — Fines and Penalties', definition: 'Civil penalties for land use violations. Fines are $275/day for first offense and $550/day for subsequent offenses.', tip: 'Penalties accrue daily once a citation is issued.', sort_order: 2 },
  { category: 'Key Statutes', term: 'RSA 676:17-a — Cease and Desist', definition: 'Authorizes immediate stop-work orders for ongoing violations.', tip: 'A powerful tool to halt activity before formal court action.', sort_order: 3 },
  { category: 'Land Use Terms', term: 'Abatement', definition: 'The act of eliminating or correcting a violation (e.g., removing an illegal structure).', tip: 'The NOV should clearly describe the steps for abatement.', sort_order: 13 },
  { category: 'Land Use Terms', term: 'Setback', definition: 'The minimum required distance between a building and a property line.', tip: 'Setback violations are the most common issue in NH towns.', sort_order: 15 }
];

export default function ResourceLibrary() {
  const { user, municipality } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [showAI, setShowAI] = useState(false);
  
  const currentTownId = municipality?.id || user?.municipality_id;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (currentTownId) {
      loadResources();
    }
  }, [currentTownId]);

  async function loadResources() {
    setLoading(true);
    try {
      // STRICT FILTER: Only get resources belonging to this specific town
      let existing = await base44.entities.Resource.filter({ 
        municipality_id: currentTownId,
        is_active: true 
      });

      // SEEDING: Only seed if this specific town has zero resources
      if (existing.length === 0 && currentTownId) {
        const seeded = await base44.entities.Resource.bulkCreate(
          DEFAULT_RESOURCES.map(r => ({ 
            ...r, 
            municipality_id: currentTownId, 
            state: municipality?.state || 'NH', 
            is_active: true 
          }))
        );
        existing = seeded;
      }
      setResources(existing);
    } catch (err) {
      console.error("Resource load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleItem = (key) => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const grouped = resources
    .filter(r => !searchTerm || r.term?.toLowerCase().includes(searchTerm.toLowerCase()) || r.definition?.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Resource Library"
        description="Plain-English explanations of land use terms and NH statutes."
        actions={
          isAdmin && (
            <Button onClick={() => setShowAI(true)} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
              <Sparkles className="w-4 h-4 text-amber-400" /> AI Curator
            </Button>
          )
        }
      />

      {showAI && (
        <AICuratePanel 
          onClose={() => { setShowAI(false); loadResources(); }} 
          municipality={municipality}
          townId={currentTownId}
        />
      )}

      {/* THE REGISTRAR: Pass townId to enable the Plan Review logic */}
      <BuildingCodeLookup 
        townName={municipality?.town_name || municipality?.name} 
        state={municipality?.state} 
        townId={currentTownId}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search town ordinances or NH statutes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-500">
                <BookOpen className="w-4 h-4" />
                {category}
              </h2>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-semibold">{item.term}</span>
                      {expandedItems[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedItems[item.id] && (
                      <div className="px-5 pb-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.definition}</p>
                        {item.tip && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Practical Inspector Tip</p>
                            <p className="text-xs text-amber-900/80">{item.tip}</p>
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
    </div>
  );
}

function AICuratePanel({ onClose, municipality, townId }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Agent session is isolated to this town's metadata
    base44.agents.createConversation({ 
      agent_name: 'resource_curator', 
      metadata: { town_id: townId, town_name: municipality?.name } 
    }).then(conv => {
      setConversation(conv);
      setMessages(conv.messages || []);
    });
  }, [townId]);

  useEffect(() => {
    if (!conversation) return;
    return base44.agents.subscribeToConversation(conversation.id, data => setMessages(data.messages || []));
  }, [conversation?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    // Explicitly instruct agent to only modify resources for the current townId
    await base44.agents.addMessage(conversation, { 
      role: 'user', 
      content: `${msg} (Constraint: Only manage resources for ${municipality?.name}, ID: ${townId})` 
    });
    setSending(false);
  }

  return (
    <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-widest">AI Curator: {municipality?.name}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50 font-mono text-[11px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-white border border-slate-200'}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 px-4 py-3 border-t bg-white">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Update statutes for this town..."
          className="flex-1 h-8 text-xs"
        />
        <Button type="submit" size="sm" className="bg-slate-900"><Send className="w-3 h-3" /></Button>
      </form>
    </div>
  );
}

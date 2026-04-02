import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw, Database } from 'lucide-react';
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
  
  // ALIGNED FIELD: Switching to town_id to match your Security Rules
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
      // FILTER UPDATE: Matching the security rule field name
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

  // TEST SEED: Uses town_id to punch through the security rule
  async function manualSeedTest() {
    try {
      await base44.entities.Resource.create({
        term: "SECURITY TEST: RSA 676:17",
        category: "Process Guides",
        definition: "Verifying the 'town_id' security handshake for " + townName,
        town_id: currentTownId,
        is_active: true
      });
      toast({ title: "Success", description: "Record passed security check." });
      loadResources();
    } catch (err) {
      toast({ title: "Security Block", description: "Database rejected the write.", variant: "destructive" });
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
          <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight uppercase tracking-tighter">Resource Library</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase">Secure ID: {currentTownId}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={manualSeedTest} variant="outline" size="sm" className="text-[10px] font-bold border-dashed uppercase">
            Test Security
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowAI(!showAI)} variant="outline" size="sm" className="gap-2 text-[10px] font-bold bg-slate-900 text-white uppercase">
              <Sparkles className="w-3 h-3 text-amber-500" /> AI Curator
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
              <Input placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-xs bg-white" />
            </div>
            <Button onClick={loadResources} variant="ghost" size="sm" className="h-8 w-8 p-0">
               <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {resources.length === 0 && !loading && (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl font-mono text-slate-400">
             NO ACCESSIBLE RECORDS FOUND
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1 text-left font-mono">{category}</p>
              <div className="grid gap-2">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm text-left">
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

    // FORCE SYNC: Telling the AI to use 'town_id' to match the security rule
    const prompt = `
      SECURITY REQUIREMENT: You MUST set the field 'town_id' to "${townId}" on every Resource you create.
      Do not use municipality_id.
      
      COMMAND: ${msg}
    `;

    await base44.agents.addMessage(conversation, { role: 'user', content: prompt });
    setSending(false);
  }

  const handleAutoCurate = () => {
    sendMessage(null, `Build out 12+ technical resources for ${townName}, ${state}.`);
  };

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white font-mono text-[10px]">
        <span className="font-bold uppercase tracking-widest">Registrar Sync</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleAutoCurate} className="h-6 text-[9px] bg-amber-500/10 text-amber-500 gap-1 border border-amber-500/20">
            <RefreshCw className={`w-2.5 h-2.5 ${sending ? 'animate-spin' : ''}`} /> Auto-Sync
          </Button>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="h-64 overflow-y-auto px-4 py-3 bg-slate-50 font-mono text-[10px] text-left">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-600' : 'text-slate-700'}`}>
            <span className="font-bold">{msg.role === 'user' ? '> ' : 'AI: '}</span>
            <div className="inline ml-1"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Sync instructions..." className="flex-1 h-9 text-xs font-mono" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4 uppercase text-[10px] font-bold" disabled={sending}>Execute</Button>
      </form>
    </div>
  );
}import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw, AlertTriangle, Database } from 'lucide-react';
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

  useEffect(() => {
    if (currentTownId) loadResources();
  }, [currentTownId]);

  async function loadResources() {
    setLoading(true);
    try {
      // Pull EVERYTHING for this town to see if the AI is mislabeling categories
      const existing = await base44.entities.Resource.filter({ 
        municipality_id: currentTownId 
      });
      setResources(existing);
    } catch (err) { console.error("Sync Error:", err); }
    setLoading(false);
  }

  // DIAGNOSTIC SEED: This creates a record WITHOUT the AI. 
  // If this shows up, your AI Agent is the one failing.
  async function manualSeedTest() {
    try {
      await base44.entities.Resource.create({
        term: "MANUAL TEST: RSA 676:17",
        category: "Process Guides",
        definition: "This is a manual test to verify the database connection for " + townName,
        municipality_id: currentTownId,
        is_active: true
      });
      toast({ title: "Test Record Created", description: "Refreshing library..." });
      loadResources();
    } catch (err) {
      toast({ title: "Database Error", description: "Failed to create manual record.", variant: "destructive" });
    }
  }

  const toggleItem = (key) => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = resources.filter(r => 
    !searchTerm || r.term?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce((acc, r) => {
    const cat = r.category || "General / Uncategorized";
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
          <p className="text-xs text-slate-500">Connected ID: <span className="font-mono text-amber-600">{currentTownId}</span></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={manualSeedTest} variant="outline" size="sm" className="gap-2 text-[10px] uppercase font-bold border-dashed">
            <Database className="w-3 h-3" /> Manual Seed Test
          </Button>
          <Button onClick={() => setShowAI(!showAI)} variant="outline" size="sm" className="gap-2 text-[10px] uppercase font-bold bg-slate-900 text-white">
            <Sparkles className="w-3 h-3 text-amber-400" /> AI Curator
          </Button>
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
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-xs bg-white" />
            </div>
            <Button onClick={loadResources} variant="ghost" size="sm" className="h-8 w-8 p-0">
               <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {resources.length === 0 && !loading && (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-300 mx-auto" />
            <p className="text-sm font-mono text-slate-400 uppercase tracking-widest">Vault Empty for {townName}</p>
          </div>
        )}

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
                        <div className="px-5 pb-5 pt-1 space-y-4 text-left border-t border-slate-50 font-mono">
                          <div className="text-sm text-slate-600 leading-relaxed py-2"><ReactMarkdown>{item.definition}</ReactMarkdown></div>
                          {item.tip && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Field Note</p>
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

    // FORCE COMMAND: Overriding the AI's tendency to just chat
    const forceCommand = `
      STRICT INSTRUCTION: Do not just reply with text. 
      Use the 'Resource' entity tool to CREATE at least 5 records now.
      Field 'municipality_id' MUST be set to: "${townId}".
      Field 'is_active' MUST be set to: true.
      
      USER COMMAND: ${msg}
    `;

    await base44.agents.addMessage(conversation, { role: 'user', content: forceCommand });
    setSending(false);
  }

  return (
    <div className="mb-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-[10px] uppercase tracking-widest font-mono tracking-tighter text-left">Registrar Curator</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
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
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Task for the Curator..." className="flex-1 h-9 text-xs font-mono" />
        <Button type="submit" size="sm" className="bg-slate-900 h-9 px-4 uppercase text-[10px] font-bold" disabled={sending}>Execute</Button>
      </form>
    </div>
  );
}

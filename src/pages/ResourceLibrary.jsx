import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import PageHeader from '../components/shared/PageHeader';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, X, RefreshCw } from 'lucide-react';
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section>
        <BuildingCodeLookup townName={townName} state={state} townId={currentTownId} />
      </section>

      <PageHeader
        title="Resource Library"
        description={`Ordinances and reference materials for ${townName}${state ? `, ${state}` : ''}.`}
        actions={
          isAdmin ? (
            <Button
              type="button"
              onClick={() => setShowAI(!showAI)}
              variant="default"
              size="sm"
              className="gap-2 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {showAI ? 'Close AI curator' : 'Open AI curator'}
            </Button>
          ) : null
        }
      />

      {showAI && (
        <AICuratePanel 
          onClose={() => { setShowAI(false); loadResources(); }} 
          townId={currentTownId}
          townName={townName}
          state={state}
        />
      )}

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Live vault</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter records…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Button type="button" onClick={loadResources} variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Refresh list">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {resources.length === 0 && !loading && (
          <div className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 py-16 text-center text-sm text-muted-foreground">
            No resources found for this municipality yet.
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <p className="ml-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
              <div className="grid gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 text-left shadow-sm ring-1 ring-black/[0.03] transition-all hover:border-primary/25 dark:ring-white/[0.05]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground">{item.term}</span>
                      {expandedItems[item.id] ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {expandedItems[item.id] && (
                      <div className="space-y-4 border-t border-border/60 px-5 pb-5 pt-3">
                        <div className="max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
                          <ReactMarkdown>{item.definition}</ReactMarkdown>
                        </div>
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
      SECURITY: The Resource entity uses field **town_id** (not municipality_id). Set town_id to "${townId}" on every Resource create/update or RLS will hide the record.

      COMMAND: ${msg}
    `;

    await base44.agents.addMessage(conversation, { role: 'user', content: prompt });
    setSending(false);
  }

  const handleAutoCurate = () => {
    sendMessage(null, `Initiate full jurisdictional review for ${townName}, ${state}. Identify 12+ technical resources and create them using town_id.`);
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white dark:bg-slate-950">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-200">AI resource curator</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoCurate}
            className="h-8 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-50"
          >
            <RefreshCw className={`h-3 w-3 ${sending ? 'animate-spin' : ''}`} />
            Auto-sync
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close curator"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="h-64 overflow-y-auto bg-muted/30 px-4 py-3 text-left text-xs">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-primary' : 'text-foreground'}`}>
            <span className="font-semibold">{msg.role === 'user' ? 'You: ' : 'Assistant: '}</span>
            <span className="ml-1 inline align-top">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 border-t border-border bg-card p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Instructions for the curator…"
          className="h-9 flex-1 text-sm"
        />
        <Button type="submit" size="sm" className="h-9 shrink-0 px-4 font-semibold" disabled={sending}>
          Send
        </Button>
      </form>
    </div>
  );
}

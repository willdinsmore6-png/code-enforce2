import { useState, useEffect, useRef } from 'react';
import BuildingCodeLookup from '../components/BuildingCodeLookup';
import { base44 } from '@/api/base44Client';
import { BookOpen, Search, ChevronDown, ChevronUp, Sparkles, Send, Loader2, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '../components/shared/PageHeader';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

// Default NH resources to seed when a municipality has none
const DEFAULT_RESOURCES = [
  { category: 'Key Statutes', term: 'RSA 676:15 — Injunctive Relief', definition: 'Allows a municipality to seek a court injunction in Superior Court to stop a land use violation and require abatement (cleanup). If the town prevails, it can recover attorney\'s fees and costs.', tip: 'Use this path (Path B) for serious or persistent violations where a court order is needed to compel compliance.', sort_order: 1 },
  { category: 'Key Statutes', term: 'RSA 676:17 — Fines and Penalties', definition: 'Establishes civil penalties for violations of local land use regulations. Fines are $275 per day for a first offense and $550 per day for subsequent offenses.', tip: 'Penalties accrue daily once a citation is issued. The district court handles these cases.', sort_order: 2 },
  { category: 'Key Statutes', term: 'RSA 676:17-a — Cease and Desist Orders', definition: 'Authorizes local officials to issue cease and desist orders when a violation is occurring. The violator must stop the illegal activity immediately upon receipt.', tip: 'A cease and desist is a powerful preliminary tool — it can be issued before formal court action.', sort_order: 3 },
  { category: 'Key Statutes', term: 'RSA 676:17-b — Land Use Citations', definition: 'Allows code enforcement officers to issue citations directly, similar to a traffic ticket. The citation directs the violator to appear in District Court.', tip: 'This is Path A — a faster, more streamlined enforcement mechanism than Superior Court.', sort_order: 4 },
  { category: 'Key Statutes', term: 'RSA 676:5 — Appeals to Zoning Board of Adjustment', definition: 'Property owners have 30 days from the date they receive a Notice of Violation to file an appeal with the local Zoning Board of Adjustment (ZBA).', tip: 'Always include ZBA appeal rights in every NOV. Failure to do so can invalidate enforcement action.', sort_order: 5 },
  { category: 'Key Statutes', term: 'RSA 595-B — Administrative Inspection Warrants', definition: 'When a violation is not visible from a public right-of-way, an officer must obtain an administrative warrant from a court before entering private property to inspect.', tip: 'Document whether the violation is visible from public access. If not, apply for a warrant before any site inspection.', sort_order: 6 },
  { category: 'Land Use Terms', term: 'Abutter', definition: 'A property owner whose land directly borders (abuts) the property in question. Abutters are typically entitled to notice of zoning actions and public hearings.', tip: 'Check your town\'s definition — some towns define abutters to include properties within a certain distance, not just direct borders.', sort_order: 10 },
  { category: 'Land Use Terms', term: 'Injunctive Relief', definition: 'A court order that requires a party to do (or stop doing) something. In land use, this typically means a court orders a property owner to stop violating and/or restore the property.', tip: 'Sought through Superior Court under RSA 676:15. More powerful than fines alone.', sort_order: 11 },
  { category: 'Land Use Terms', term: 'ZBA Appeal', definition: 'The Zoning Board of Adjustment (ZBA) is the local body that hears appeals of administrative decisions made by code enforcement officers and building inspectors.', tip: 'The ZBA can uphold, modify, or overturn a code enforcement decision.', sort_order: 12 },
  { category: 'Land Use Terms', term: 'Abatement', definition: 'The act of eliminating or correcting a violation. For example, removing an illegal structure or ceasing an unpermitted use.', tip: 'The NOV should clearly describe what the violator must do to achieve abatement.', sort_order: 13 },
  { category: 'Land Use Terms', term: 'Notice of Violation (NOV)', definition: 'A formal written notice informing a property owner that their property is in violation of a specific code or ordinance, and providing a deadline to correct the violation.', tip: 'Must be specific: cite the exact code, describe the violation, set a clear deadline, and include appeal rights.', sort_order: 14 },
  { category: 'Land Use Terms', term: 'Setback', definition: 'The minimum required distance between a building or structure and a property line, road, or other boundary as specified in the local zoning ordinance.', tip: 'Setback violations are among the most common issues in NH towns.', sort_order: 15 },
  { category: 'Land Use Terms', term: 'Variance', definition: 'Permission from the ZBA to use property in a way that deviates from the zoning ordinance. Granted only when strict application of the ordinance would cause unnecessary hardship.', tip: 'A violator may apply for a variance as an alternative to abatement.', sort_order: 16 },
  { category: 'Land Use Terms', term: 'Cease and Desist', definition: 'An order requiring immediate cessation of an illegal activity. In NH land use, authorized under RSA 676:17-a.', tip: 'More urgent than an NOV — demands immediate stop, not just compliance within a deadline.', sort_order: 17 },
  { category: 'Process Guides', term: 'Complaint-to-Resolution Lifecycle', definition: '1. Receive complaint → 2. Investigate → 3. Issue NOV → 4. Monitor compliance → 5. If non-compliant, choose Path A (Citation) or Path B (Court) → 6. Resolve', tip: 'Use the Action Wizard for step-by-step guidance at each stage.', sort_order: 20 },
  { category: 'Process Guides', term: 'Dual Delivery Requirement', definition: 'NH best practice recommends sending the NOV via both Certified Mail (provides proof of delivery) and First Class Mail (in case certified mail is refused). This ensures the violator cannot claim non-receipt.', tip: 'Always track certified mail return receipts and log them in the system.', sort_order: 21 },
  { category: 'Process Guides', term: 'Penalty Calculation (RSA 676:17)', definition: 'First offense: $275 per day. Subsequent offense (same violator, same or similar violation): $550 per day. Penalties begin accruing from the date of citation.', tip: 'Track penalty start date carefully. Total accrued fines are calculated as: (number of days) × (daily rate).', sort_order: 22 },
];

export default function ResourceLibrary() {
  const { user, municipality } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [townConfig, setTownConfig] = useState(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    loadResources();
    base44.entities.TownConfig.list('-created_date', 1).then(configs => {
      if (configs[0]) setTownConfig(configs[0]);
    });
  }, []);

  async function loadResources() {
    setLoading(true);
    let existing = await base44.entities.Resource.filter({ is_active: true });
    if (existing.length === 0 && user?.municipality_id) {
      // Seed with defaults
      const seeded = await base44.entities.Resource.bulkCreate(
        DEFAULT_RESOURCES.map(r => ({ ...r, municipality_id: user.municipality_id, state: 'NH', is_active: true }))
      );
      existing = seeded;
    }
    setResources(existing);
    setLoading(false);
  }

  const toggleItem = (key) => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const grouped = resources
    .filter(r => !searchTerm || r.term?.toLowerCase().includes(searchTerm.toLowerCase()) || r.definition?.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {});

  Object.values(grouped).forEach(items => items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Resource Library"
        description="Plain-English explanations of land use terms, statutes, and processes"
        actions={
          isAdmin && (
            <Button onClick={() => setShowAI(true)} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0">
              <Sparkles className="w-4 h-4" /> AI Curate
            </Button>
          )
        }
      />

      {showAI && (
        <AICuratePanel onClose={() => { setShowAI(false); loadResources(); }} municipality={municipality} />
      )}

      <BuildingCodeLookup townName={townConfig?.town_name || municipality?.name} state={townConfig?.state || municipality?.state} />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search terms, statutes, or definitions..."
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
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {category}
              </h2>
              <div className="space-y-2">
                {items.map(item => {
                  const key = item.id || item.term;
                  const isExpanded = expandedItems[key];
                  return (
                    <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-sm font-semibold">{item.term}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.definition}</p>
                          {item.tip && (
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                              <p className="text-xs font-semibold text-primary mb-0.5">💡 Practical Tip</p>
                              <p className="text-xs text-muted-foreground">{item.tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">No resources found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AICuratePanel({ onClose, municipality }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.agents.createConversation({ agent_name: 'resource_curator', metadata: { name: 'Resource Curation' } })
      .then(conv => {
        setConversation(conv);
        setMessages(conv.messages || []);
      });
  }, []);

  useEffect(() => {
    if (!conversation) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, data => setMessages(data.messages || []));
    return unsub;
  }, [conversation?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || !conversation || sending) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: msg });
    setSending(false);
  }

  function handleQuickCurate() {
    setInput(`Please review and curate the resource library for ${municipality?.name || 'our municipality'} (${municipality?.state || 'our state'}). Update any state-specific statutes to be accurate for our location, and add any new relevant resources.`);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user';

  return (
    <div className="mb-6 border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-sm text-indigo-900">AI Resource Curator</span>
          <span className="text-xs text-indigo-500">· Updates resources for {municipality?.name || 'your municipality'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleQuickCurate} className="text-xs gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
            <RefreshCw className="w-3 h-3" /> Auto-Curate
          </Button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
        {messages.length === 0 && !conversation && (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        )}
        {messages.length === 0 && conversation && (
          <p className="text-xs text-center text-muted-foreground py-8">
            Ask me to review and update your resource library, or click <strong>Auto-Curate</strong> to get started.
          </p>
        )}
        {messages.map((msg, i) => {
          if (!msg.content) return null;
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${isUser ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200'}`}>
                {isUser ? msg.content : (
                  <ReactMarkdown className="prose prose-xs prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}
        {(isLoading || sending) && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-white">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the AI to update, add, or review resources..."
          className="flex-1 text-sm h-8"
          disabled={sending || !conversation}
        />
        <Button type="submit" size="sm" disabled={sending || !input.trim() || !conversation} className="h-8 w-8 p-0">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </form>
    </div>
  );
}
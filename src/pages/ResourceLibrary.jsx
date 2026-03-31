import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Send, 
  Loader2, 
  X, 
  Scale, 
  Gavel, 
  ShieldAlert, 
  Info, 
  Download 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '../components/shared/PageHeader';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

// Keep your existing NH defaults
const DEFAULT_RESOURCES = [
  { category: 'Key Statutes', term: 'RSA 676:15 — Injunctive Relief', definition: 'Allows a municipality to seek a court injunction in Superior Court to stop a land use violation and require abatement (cleanup). If the town prevails, it can recover attorney\'s fees and costs.', tip: 'Use this path (Path B) for serious or persistent violations where a court order is needed to compel compliance.', sort_order: 1 },
  { category: 'Key Statutes', term: 'RSA 676:17 — Fines and Penalties', definition: 'Establishes civil penalties for violations of local land use regulations. Fines are $275 per day for a first offense and $550 per day for subsequent offenses.', tip: 'Penalties accrue daily once a citation is issued. The district court handles these cases.', sort_order: 2 },
  { category: 'Key Statutes', term: 'RSA 676:17-a — Cease and Desist Orders', definition: 'Authorizes local officials to issue cease and desist orders when a violation is occurring. The violator must stop the illegal activity immediately upon receipt.', tip: 'A cease and desist is a powerful preliminary tool — it can be issued before formal court action.', sort_order: 3 },
  { category: 'Key Statutes', term: 'RSA 676:17-b — Land Use Citations', definition: 'Allows code enforcement officers to issue citations directly, similar to a traffic ticket. The citation directs the violator to appear in District Court.', tip: 'This is Path A — a faster, more streamlined enforcement mechanism than Superior Court.', sort_order: 4 },
  { category: 'Key Statutes', term: 'RSA 676:5 — Appeals to Zoning Board of Adjustment', definition: 'Property owners have 30 days from the date they receive a Notice of Violation to file an appeal with the local Zoning Board of Adjustment (ZBA).', tip: 'Always include ZBA appeal rights in every NOV. Failure to do so can invalidate enforcement action.', sort_order: 5 },
  { category: 'Key Statutes', term: 'RSA 595-B — Administrative Inspection Warrants', definition: 'When a violation is not visible from a public right-of-way, an officer must obtain an administrative warrant from a court before entering private property to inspect.', tip: 'Document whether the violation is visible from public access. If not, apply for a warrant before any site inspection.', sort_order: 6 },
];

export default function ResourceLibrary() {
  const { user, municipality } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadResources();
  }, [municipality]);

  async function loadResources() {
    setLoading(true);
    let existing = await base44.entities.Resource.filter({ is_active: true });
    if (existing.length === 0 && user?.municipality_id) {
      const seeded = await base44.entities.Resource.bulkCreate(
        DEFAULT_RESOURCES.map(r => ({ ...r, municipality_id: user.municipality_id, state: 'NH', is_active: true }))
      );
      existing = seeded;
    }
    setResources(existing);
    setLoading(false);
  }

  async function askAI(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setAiLoading(true);
    setShowAI(true);
    try {
      const res = await base44.functions.invoke('curateResourceLibrary', { 
        prompt: query, 
        context: municipality?.town_name 
      });
      setAiResponse(res.data?.answer || "I couldn't find a specific legal reference for that. Please check the RSAs directly.");
    } catch (err) {
      setAiResponse("System error: AI guidance is currently offline.");
    }
    setAiLoading(false);
  }

  const toggleItem = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const categories = [...new Set(resources.map(r => r.category))];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Legal Resource Library"
        description={`Statutory guidance and NH RSA protocols for ${municipality?.town_name || 'Code Enforcement'}.`}
        actions={
          <Button onClick={() => setShowAI(!showAI)} variant={showAI ? "default" : "outline"} className="gap-2 shadow-sm">
            <Sparkles className={`w-4 h-4 ${showAI ? 'animate-pulse' : 'text-primary'}`} />
            {showAI ? "Close Assistant" : "Ask Legal Agent"}
          </Button>
        }
      />

      {/* AI Assistant Panel */}
      {showAI && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-white/10 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Statutory AI Guide
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowAI(false)} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {aiResponse && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            )}
            
            <form onSubmit={askAI} className="flex gap-2">
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., How do I serve a Cease and Desist in New Hampshire?" 
                className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-12"
              />
              <Button type="submit" disabled={aiLoading} className="h-12 px-6">
                {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Resource Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search statutes or legal terms..."
          className="pl-10 h-11 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grouped Statutory Resources */}
      {categories.map(cat => (
        <div key={cat} className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Scale className="w-3.5 h-3.5" /> {cat}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {resources.filter(r => r.category === cat && (!searchTerm || r.term.toLowerCase().includes(searchTerm.toLowerCase()))).map(res => (
              <div key={res.id} className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:shadow-md">
                <button 
                  onClick={() => toggleItem(res.id)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      {cat.includes('Statute') ? <Gavel className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-sm tracking-tight">{res.term}</span>
                  </div>
                  {expandedItems[res.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedItems[res.id] && (
                  <div className="px-5 pb-5 pt-0 space-y-4 animate-in fade-in duration-300">
                    <p className="text-sm text-slate-500 leading-relaxed bg-muted/50 p-4 rounded-xl border border-border">
                      {res.definition}
                    </p>
                    {res.tip && (
                      <div className="flex gap-3 items-start p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-medium text-amber-800 leading-tight">
                          <span className="font-black uppercase tracking-tighter mr-1">Pro Tip:</span> 
                          {res.tip}
                        </p>
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
  );
}

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  HardHat, 
  Send, 
  Loader2, 
  Search, 
  Info, 
  AlertTriangle, 
  BookOpen, 
  Construction,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BuildingCodeLookup({ townName, state }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    
    const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
    const prompt = `You are a building code expert for ${locationContext}. Answer the following question using New Hampshire building codes (RSA 155-A), local zoning ordinances, and current IBC/IRC standards. 
    
    Format:
    1. Direct Answer
    2. Specific Code Citations
    3. Practical Advice for the Officer
    
    Question: ${question}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
    });
    setAnswer(result);
    setLoading(false);
  }

  const quickQuestions = [
    "Residential deck guardrail height requirements?",
    "Pool fencing and gate latch standards?",
    "Setback requirements for accessory sheds?"
  ];

  return (
    <div className="mb-8 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Header with Industrial Styling */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-amber-100 bg-amber-50/50">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Code Search Engine</h3>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <Construction className="w-3 h-3" /> Targeted: {townName || 'Municipal'} Context
                </p>
            </div>
        </div>
        <div className="hidden sm:block">
             <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded uppercase">RSA 155-A Ready</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about setbacks, egress, fire codes, or zoning..."
                className="min-h-[120px] rounded-2xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20 transition-all resize-none text-md p-4"
            />
            <div className="absolute bottom-3 right-3">
                <Button 
                    type="submit" 
                    disabled={loading || !question.trim()} 
                    className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Consulting Codes...' : 'Analyze'}
                </Button>
            </div>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        {!answer && (
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Common Inquiries</p>
                <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((q, i) => (
                        <button 
                            key={i} 
                            onClick={() => { setQuestion(q); }}
                            className="text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {answer && (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Code Analysis Output
                </p>
                <Button variant="ghost" size="sm" onClick={() => setAnswer('')} className="h-6 px-2 text-[10px] uppercase font-bold text-slate-400">Clear</Button>
            </div>
            
            <div className="prose prose-sm prose-slate max-w-none prose-headings:font-black prose-p:leading-relaxed text-slate-700">
              <ReactMarkdown>
                {answer}
              </ReactMarkdown>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-medium text-slate-500 italic leading-tight">
                    DISCLAIMER: AI-generated guidance based on RSA 155-A. This is a reference tool, not a legal certification. Verify all findings with your certified Building Official.
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

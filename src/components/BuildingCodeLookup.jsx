import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BuildingCodeLookup({ townName, state }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
    const prompt = `You are a building code expert for ${locationContext}. Answer the following question using New Hampshire building codes, local ordinances, and IBC/IRC standards as applicable to ${locationContext}. Be specific and practical. Cite relevant code sections where possible.

Question: ${question}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
    });
    setAnswer(result);
    setLoading(false);
  }

  return (
    <div className="mb-8 bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-amber-50">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <HardHat className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Building Code Lookup</p>
          <p className="text-xs text-amber-700">AI-powered lookup specific to {townName ? `${townName}, ${state}` : state || 'your municipality'}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. What are the setback requirements for accessory structures? What permits are needed for a deck addition?"
            rows={3}
            className="resize-none"
          />
          <Button type="submit" disabled={loading || !question.trim()} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Looking up...' : 'Look Up Code'}
          </Button>
        </form>

        {answer && (
          <div className="bg-muted/40 rounded-lg p-4 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">AI Response</p>
            <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-sm">
              {answer}
            </ReactMarkdown>
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">
              ⚠️ This is AI-generated guidance. Always verify with official code documents and your building official.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
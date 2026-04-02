import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Send, Loader2, FileUp, X, ClipboardCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/components/ui/use-toast';

export default function BuildingCodeLookup({ townName, state }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || (!question.trim() && !selectedFile)) return;
    
    setLoading(true);
    setAnswer('');

    // The Registrar's Context
    const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
    
    try {
      const prompt = `You are "The Registrar," a building code expert for ${locationContext}. 
      Task: Perform a technical review based on the following:
      ${selectedFile ? `ATTACHED DOCUMENT: ${selectedFile.name}` : ''}
      USER QUESTION: ${question}

      Instructions: Cite NH Building Codes (IBC/IRC/NFPA) and local ${townName} ordinances. 
      Provide a 'no-fluff' professional memo.`;

      // Using the Core LLM (Safe fallback) but passing the file as an attachment
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        attachments: selectedFile ? [selectedFile] : []
      });

      setAnswer(result);
      setSelectedFile(null); // Reset file after success
    } catch (error) {
      console.error("Registrar Lookup Failed:", error);
      toast({
        title: "Lookup Error",
        description: "Could not reach the code vault. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <HardHat className="w-5 h-5 text-amber-500" />
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-wider text-white">The Registrar: Code Research</p>
            <p className="text-[10px] text-slate-400 font-mono italic">Specific to {townName || 'New Hampshire'}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Simple File Upload UI */}
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-xs gap-2 border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-3 h-3" />
            {selectedFile ? selectedFile.name : "Attach Plan (Optional)"}
          </Button>
          {selectedFile && (
            <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => setSelectedFile(e.target.files[0])}
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a code question or describe the plan check needed..."
            rows={3}
            className="resize-none font-mono text-sm border-slate-200"
          />
          <div className="flex justify-between items-center">
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Consulting...' : 'Execute Review'}
            </Button>
            {answer && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(answer);
                  toast({ title: "Copied to Clipboard" });
                }}
              >
                <ClipboardCheck className="w-3 h-3" /> Copy Memo
              </Button>
            )}
          </div>
        </form>

        {answer && (
          <div className="mt-4 bg-slate-50 rounded-lg p-5 border border-slate-200 text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Formal Response</p>
            <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800">
              {answer}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

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
    // Allow submission if there is a question OR a file
    if (loading || (!question.trim() && !selectedFile)) return;
    
    setLoading(true);
    setAnswer('');
    
    try {
      const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
      
      // The prompt tells the AI it is looking at a specific file but doesn't save it
      const prompt = `You are "The Registrar," a building code expert for ${locationContext}. 
      ${selectedFile ? `Reviewing attached file: ${selectedFile.name}` : ''}
      
      Question: ${question || 'Please perform a general code compliance review of the attached plan.'}`;

      // This call sends the file to the AI's memory ONLY
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        attachments: selectedFile ? [selectedFile] : []
      });

      setAnswer(result);
      
      // Reset the file input so it's clean for the next review
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error) {
      console.error("Lookup failed:", error);
      toast({ title: "Error", description: "The Registrar could not complete the review.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm text-left">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-slate-900 text-white">
        <HardHat className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Code Research</p>
          <p className="text-[10px] text-slate-400 font-mono italic tracking-tight">Ephemeral Review Mode • {townName || 'New Hampshire'}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Attachment UI - No Database Logic Linked */}
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-xs gap-2 border-dashed border-slate-300"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-3 h-3" />
            {selectedFile ? selectedFile.name : "Attach Plan (Review Only)"}
          </Button>
          {selectedFile && (
            <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a code question or attach a plan for a compliance check..."
            rows={3}
            className="resize-none font-mono text-sm border-slate-200"
          />
          
          <div className="flex justify-between items-center">
             <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight font-mono">
              Files are processed in memory and NOT saved to the town vault.
            </p>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Consulting...' : 'Execute Review'}
            </Button>
          </div>
        </form>

        {answer && (
          <div className="mt-4 bg-slate-50 rounded-lg p-5 border border-slate-200 text-left">
            <div className="flex justify-between items-center mb-3">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrar Findings</p>
               <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(answer);
                  toast({ title: "Copied to Clipboard" });
                }}
              >
                <ClipboardCheck className="w-3 h-3" /> Copy Findings
              </Button>
            </div>
            <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800">
              {answer}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

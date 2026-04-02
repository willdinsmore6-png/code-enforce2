import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { HardHat, Send, Loader2, FileUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/components/ui/use-toast';

export default function BuildingCodeLookup({ townName, state, townId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shouldSaveToVault, setShouldSaveToVault] = useState(false);
  const fileInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || (!question.trim() && !selectedFile)) return;
    
    setLoading(true);
    setAnswer('');
    
    try {
      // 1. If "Save to Vault" is checked, we upload the file permanently
      if (selectedFile && shouldSaveToVault) {
        await base44.entities.Document.create({
          name: `Plan Review: ${selectedFile.name}`,
          town_id: townId,
          category: 'plan_review',
          file: selectedFile
        });
      }

      const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
      const prompt = `You are a building code expert for ${locationContext}. Answer the following question using New Hampshire building codes, local ordinances, and IBC/IRC standards.
      ${selectedFile ? `Reviewing attached file: ${selectedFile.name}` : ''}
      
      Question: ${question}`;

      // 2. We use the WORKING InvokeLLM call
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        // We pass the file as an attachment to the LLM
        attachments: selectedFile ? [selectedFile] : []
      });

      setAnswer(result);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Lookup failed:", error);
      toast({ title: "Error", description: "Review execution failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-slate-900 text-white">
        <HardHat className="w-5 h-5 text-amber-500" />
        <div className="text-left">
          <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Code Research</p>
          <p className="text-[10px] text-slate-400 font-mono italic">Specific to {townName || 'New Hampshire'}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* File Attachment Section */}
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-xs gap-2 border-dashed border-slate-300"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-3 h-3" />
            {selectedFile ? selectedFile.name : "Attach Plan (Optional)"}
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
            placeholder="Ask a code question or describe the plan check needed..."
            rows={3}
            className="resize-none font-mono text-sm border-slate-200"
          />
          
          <div className="flex items-center justify-between">
            {/* The Checkbox is back */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vault" 
                checked={shouldSaveToVault} 
                onCheckedChange={setShouldSaveToVault} 
              />
              <label htmlFor="vault" className="text-xs font-medium text-slate-600 cursor-pointer">
                Save to Town Vault
              </label>
            </div>

            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Consulting...' : 'Execute Review'}
            </Button>
          </div>
        </form>

        {answer && (
          <div className="mt-4 bg-slate-50 rounded-lg p-5 border border-slate-200 text-left">
            <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800">
              {answer}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

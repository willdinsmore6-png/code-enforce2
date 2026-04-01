import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HardHat, Send, Loader2, FileUp, ClipboardCheck, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/components/ui/use-toast';

export default function BuildingCodeLookup({ townName, state, townId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shouldSaveToVault, setShouldSaveToVault] = useState(false);
  const fileInputRef = useRef(null);

  async function handleReview(e) {
    e.preventDefault();
    
    // Safety check to ensure button only fires when there is content
    if (loading || (!question.trim() && !selectedFile)) return;
    
    setLoading(true);
    setAnswer('');

    try {
      // 1. Storage Logic: Permanent vs Ephemeral
      if (selectedFile && shouldSaveToVault) {
        await base44.entities.Document.create({
          name: `Plan Review: ${selectedFile.name}`,
          town_id: townId,
          category: 'plan_review',
          file: selectedFile
        });
      }

      // 2. The Registrar Execution:
      // Calls the specialized Compass agent with current town context
      const result = await base44.agents.compass.chat({
        message: selectedFile 
          ? `Perform a formal plan review of the attached document: ${selectedFile.name}. ${question}`
          : question,
        attachments: (!shouldSaveToVault && selectedFile) ? [selectedFile] : [],
        context: {
          town_id: townId,
          town_name: townName,
          mode: "plan_reviewer",
          is_ephemeral: !shouldSaveToVault,
          instruction_override: `
            Act as the Municipal Building Official (The Registrar) for ${townName}. 
            Provide a technical, 'no-fluff' plan review memo.
            If a document is attached, perform a compliance analysis against NH RSA Title LXIV and IBC/IRC standards.
            Structure:
            1. PROJECT COMPLIANCE SUMMARY
            2. DISCREPANCIES (Cite specific Code/RSA)
            3. REQUIRED ACTIONS
          `
        }
      });
      
      setAnswer(result.reply);
      
      // Cleanup
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error) {
      console.error("Plan review failed:", error);
      toast({ 
        title: "Review Error", 
        description: "The Registrar was unable to reach the vault. Verify your permissions.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer);
    toast({ title: "Memo Copied", description: "Technical summary added to clipboard." });
  };

  return (
    <div className="mb-8 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Plan Review</p>
            <p className="text-[10px] text-slate-400 font-mono">Jurisdiction: {townName || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Upload Interface */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Document for Analysis</label>
          <div 
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all ${
              selectedFile ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => setSelectedFile(e.target.files[0])}
              accept=".pdf,.png,.jpg,.jpeg"
            />
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-1 hover:bg-amber-100 rounded-full">
                  <X className="w-4 h-4 text-amber-700" />
                </button>
              </div>
            ) : (
              <>
                <FileUp className="w-6 h-6 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Click to attach plans for review</p>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleReview} className="space-y-4">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Add specific instructions (e.g., 'Check for side-yard setbacks')..."
            className="w-full p-3 rounded-md border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="vault" checked={shouldSaveToVault} onCheckedChange={setShouldSaveToVault} />
              <label htmlFor="vault" className="text-xs font-medium text-slate-600 cursor-pointer">
                Save to Town Vault
              </label>
            </div>

            <Button type="submit" disabled={loading || (!question.trim() && !selectedFile)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Consulting Code...' : 'Execute Review'}
            </Button>
          </div>
        </form>

        {answer && (
          <div className="mt-4 bg-white rounded-lg border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Compliance Result</span>
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 text-[10px] gap-1">
                <ClipboardCheck className="w-3 h-3" /> Copy Memo
              </Button>
            </div>
            <div className="p-5 overflow-auto max-h-[500px]">
              <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800">
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

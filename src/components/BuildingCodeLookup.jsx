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
    if (e) e.preventDefault();
    if (loading) return;
    
    // Validate input
    if (!question.trim() && !selectedFile) {
      toast({
        title: "Input Required",
        description: "Please enter a question or attach a document to review.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setAnswer('');

    try {
      // 1. Permanent Storage logic
      if (selectedFile && shouldSaveToVault) {
        await base44.entities.Document.create({
          name: `Plan Review: ${selectedFile.name}`,
          town_id: townId,
          category: 'plan_review',
          file: selectedFile
        });
      }

      // 2. The Registrar Execution Logic
      const result = await base44.agents.compass.chat({
        message: selectedFile 
          ? `Perform a formal plan review of the attached document: ${selectedFile.name}. ${question}`
          : question,
        attachments: (!shouldSaveToVault && selectedFile) ? [selectedFile] : [],
        context: {
          town_id: townId,
          town_name: townName || "Bow",
          mode: "plan_reviewer",
          is_ephemeral: !shouldSaveToVault,
          instruction_override: `
            Act as the Municipal Building Official (The Registrar). 
            Provide a technical, 'no-fluff' plan review memo citing IBC, IRC, and NH RSA Title LXIV.
            Structure:
            ### COMPLIANCE SUMMARY
            ### CODE DISCREPANCIES
            ### REQUIRED ACTIONS
          `
        }
      });
      
      if (result?.reply) {
        setAnswer(result.reply);
      } else {
        throw new Error("No response from Compass.");
      }

      // Cleanup
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error) {
      console.error("Execution failed:", error);
      toast({ 
        title: "Review Failed", 
        description: "The Registrar could not reach Compass. Verify your townId and permissions.", 
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
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Plan Review</p>
            <p className="text-[10px] text-slate-400 font-mono">Jurisdiction: {townName || 'Bow, NH'}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left block">Target Document</label>
          <div 
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all ${
              selectedFile ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" />
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 hover:bg-amber-100 rounded-full">
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

        <div className="space-y-4">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. Verify side-yard setbacks for this ADU plan..."
            className="w-full p-3 rounded-md border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px] block"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="vault-save" checked={shouldSaveToVault} onCheckedChange={setShouldSaveToVault} />
              <label htmlFor="vault-save" className="text-xs font-medium text-slate-600 cursor-pointer text-left">Save to Town Vault</label>
            </div>
            <Button onClick={handleReview} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Consulting Code...' : 'Execute Review'}
            </Button>
          </div>
        </div>

        {answer && (
          <div className="mt-4 bg-white rounded-lg border border-slate-200 shadow-lg text-left">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Compliance Result</span>
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 text-[10px] gap-1">
                <ClipboardCheck className="w-3 h-3" /> Copy Memo
              </Button>
            </div>
            <div className="p-5 overflow-auto max-h-[500px]">
              <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800 text-left">
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

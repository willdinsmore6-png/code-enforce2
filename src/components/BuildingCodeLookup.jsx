import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HardHat, Send, Loader2, FileUp, ClipboardCheck, X } from 'lucide-react';
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
    if (loading) return;
    setLoading(true);
    setAnswer('');

    try {
      let fileContext = null;

      // 1. Conditional Storage Logic
      if (selectedFile && shouldSaveToVault) {
        // PERMANENT: Upload to the Document Entity
        const uploadResult = await base44.entities.Document.create({
          name: `Plan Review: ${selectedFile.name}`,
          town_id: townId,
          category: 'plan_review',
          file: selectedFile
        });
        fileContext = `[File ID: ${uploadResult.id}]`;
      }

      // 2. Execute Review via Compass
      // If NOT saving to vault, we pass the file directly in the message payload
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
            If is_ephemeral is true, do not reference database IDs.
            Structure:
            1. PROJECT COMPLIANCE SUMMARY
            2. DISCREPANCIES (Cite IBC/IRC/RSA)
            3. REQUIRED CORRECTIONS
          `
        }
      });
      
      setAnswer(result.reply);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error) {
      console.error("Plan review failed:", error);
      toast({ 
        title: "Review Error", 
        description: "The Registrar was unable to process the request.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer);
    toast({ title: "Memo Copied", description: "Ready for formal notice or report." });
  };

  return (
    <div className="mb-8 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Plan Review</p>
            <p className="text-[10px] text-slate-400 font-mono">{townName ? `${townName}, ${state}` : 'Jurisdiction Pending'}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* File Dropzone */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Document (PDF/Image)</label>
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
                <FileUp className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="p-1 hover:bg-amber-100 rounded-full text-amber-700"
                >
                  <X className="w-4 h-4" />
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

        {/* Form Controls */}
        <form onSubmit={handleReview} className="space-y-4">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. Verify side-yard setbacks for this ADU plan..."
            className="w-full p-3 rounded-md border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px]"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vault" 
                checked={shouldSaveToVault}
                onCheckedChange={setShouldSaveToVault}
              />
              <label htmlFor="vault" className="text-xs font-medium text-slate-600 cursor-pointer">
                Save document to Town Vault
              </label>
            </div>

            <Button 
              type="submit" 
              disabled={loading || (!question.trim() && !selectedFile)} 
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Reviewing...' : 'Execute Review'}
            </Button>
          </div>
        </form>

        {/* Results Window */}
        {answer && (
          <div className="mt-4 bg-white rounded-lg border-l-4 border-amber-500 shadow-md">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Compliance Memo</span>
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 text-[10px] gap-1">
                <ClipboardCheck className="w-3 h-3" /> Copy
              </Button>
            </div>
            <div className="p-5 overflow-auto max-h-[600px]">
              <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed">
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

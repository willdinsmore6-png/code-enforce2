import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Send, Loader2, FileUp, X, ClipboardCheck, ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/components/ui/use-toast';

function isImageFile(file) {
  return file?.type?.startsWith('image/');
}

/**
 * Building / plan review via Core.InvokeLLM.
 * Files are uploaded for the request so the backend can run vision / PDF extraction (not case-linked).
 */
export default function BuildingCodeLookup({ townName, state, townId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedFile || !isImageFile(selectedFile)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || (!question.trim() && !selectedFile)) return;

    setLoading(true);
    setAnswer('');

    try {
      const locationContext = townName && state ? `${townName}, ${state}` : state || 'New Hampshire';
      const jurisdictionNote = townId
        ? `Active jurisdiction town_id: ${townId}. Prioritize ${locationContext} local codes and applicable state/federal rules.`
        : `Jurisdiction context: ${locationContext}.`;

      let file_urls = [];
      if (selectedFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
        if (file_url) file_urls = [file_url];
      }

      const isImage = selectedFile && isImageFile(selectedFile);
      const isPdf = selectedFile?.name?.toLowerCase().endsWith('.pdf');

      const prompt = `You are "The Registrar," a building code and zoning compliance specialist for ${locationContext}.
${jurisdictionNote}

${selectedFile ? `A ${isImage ? 'plan/drawing IMAGE' : isPdf ? 'PDF document' : 'file'} was submitted for review.
File name: ${selectedFile.name}
${file_urls[0] ? `Accessible URL for analysis: ${file_urls[0]}` : ''}

You MUST:
1) If this is a drawing, site plan, or photo: describe what you see (layout, setbacks, structures, labels, dimensions if legible) before applying code concepts.
2) If this is a PDF application or narrative: summarize key compliance-relevant facts.
3) Tie observations to likely code topics (setbacks, egress, fire separation, zoning use, etc.) for this state/region.
4) Clearly separate FACTS visible in the file from INTERPRETATION — you are not a substitute for the building official.

` : ''}
User question: ${question.trim() || 'Perform a structured code compliance review based on the attached file and typical requirements for this jurisdiction.'}`;

      const payload = {
        prompt,
        add_context_from_internet: true,
      };
      if (file_urls.length > 0) {
        payload.file_urls = file_urls;
      }
      if (selectedFile && file_urls.length === 0) {
        payload.attachments = [selectedFile];
      }

      const result = await base44.integrations.Core.InvokeLLM(payload);

      setAnswer(typeof result === 'string' ? result : result?.text || result?.content || JSON.stringify(result));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Lookup failed:', error);
      toast({
        title: 'Review failed',
        description: error?.message || 'The Registrar could not complete the review. Try a smaller file or a photo export of your plan.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm text-left">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-slate-900 text-white">
        <HardHat className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wider">The Registrar: Code research & plan review</p>
          <p className="text-[10px] text-slate-400 font-mono italic tracking-tight">
            Text + visual/PDF review · Ephemeral upload · {townName || 'Jurisdiction'}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-2 border-dashed border-slate-300"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-3 h-3" />
            {selectedFile ? selectedFile.name : 'Attach plan, PDF, or photo'}
          </Button>
          {selectedFile && (
            <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500" aria-label="Remove file">
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            accept=".pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
          />
        </div>

        {previewUrl && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex gap-3 items-start">
            <ImageIcon className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Preview (sent for AI vision)</p>
              <img src={previewUrl} alt="Attached plan preview" className="max-h-48 rounded border border-slate-200 object-contain bg-white" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a code question, or attach a plan/PDF and ask for a compliance review..."
            rows={3}
            className="resize-none font-mono text-sm border-slate-200"
          />

          <div className="flex justify-between items-center gap-4 flex-wrap">
            <p className="text-[10px] text-slate-400 max-w-xs leading-tight font-mono">
              Uploads are stored only for model processing (same as other app uploads), not attached to a case file.
            </p>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Reviewing...' : 'Run review'}
            </Button>
          </div>
        </form>

        {answer && (
          <div className="mt-4 bg-slate-50 rounded-lg p-5 border border-slate-200 text-left">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrar findings</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(answer);
                  toast({ title: 'Copied to clipboard' });
                }}
              >
                <ClipboardCheck className="w-3 h-3" /> Copy
              </Button>
            </div>
            <ReactMarkdown className="prose prose-sm prose-slate max-w-none text-slate-800">{answer}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

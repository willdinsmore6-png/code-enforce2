import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText } from 'lucide-react';

const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const pdfTypes = ['pdf'];

function getExtension(url) {
  if (!url) return '';
  const clean = url.split('?')[0];
  return clean.split('.').pop().toLowerCase();
}

export default function DocumentPreview({ document, open, onClose }) {
  if (!document) return null;

  const ext = getExtension(document.file_url);
  const isImage = imageTypes.includes(ext);
  const isPdf = pdfTypes.includes(ext);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{document.title}</DialogTitle>
            {document.file_url && (
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
          </div>
          {document.description && (
            <p className="text-sm text-muted-foreground mt-1">{document.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 mt-2">
          {isImage && (
            <img
              src={document.file_url}
              alt={document.title}
              className="max-w-full h-auto rounded-lg mx-auto block"
            />
          )}
          {isPdf && (
            <iframe
              src={document.file_url}
              className="w-full h-[60vh] rounded-lg border border-border"
              title={document.title}
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-sm mb-4">Preview not available for this file type (.{ext || 'unknown'})</p>
              {document.file_url && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" /> Open / Download File
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
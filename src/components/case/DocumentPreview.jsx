import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isLikelyPublicFileUrl, getDocumentSignedUrl } from '@/lib/documentFileAccess';

const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const pdfTypes = ['pdf'];

function getExtension(url) {
  if (!url) return '';
  const clean = url.split('?')[0];
  return clean.split('.').pop().toLowerCase();
}

export default function DocumentPreview({ document, open, onClose }) {
  const { user, impersonatedMunicipality } = useAuth();
  const [mediaUrl, setMediaUrl] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  useEffect(() => {
    if (!open || !document?.file_url) {
      setMediaUrl(null);
      setResolveError(null);
      return;
    }

    if (isLikelyPublicFileUrl(document.file_url)) {
      setMediaUrl(document.file_url);
      setResolveError(null);
      return;
    }

    if (!document.id) {
      setMediaUrl(null);
      setResolveError('Missing document id');
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolveError(null);

    (async () => {
      try {
        const { signedUrl } = await getDocumentSignedUrl(user, impersonatedMunicipality, document.id);
        if (!cancelled) {
          setMediaUrl(signedUrl);
        }
      } catch (e) {
        console.error('Document signed URL failed:', e);
        if (!cancelled) {
          setMediaUrl(null);
          setResolveError(e.message || 'Could not open private file');
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, document?.id, document?.file_url, user, impersonatedMunicipality]);

  if (!document) return null;

  const ext = getExtension(document.file_url);
  const isImage = imageTypes.includes(ext);
  const isPdf = pdfTypes.includes(ext);
  const displayUrl = mediaUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="truncate pr-4">{document.title}</DialogTitle>
            {displayUrl && !resolving && (
              <a
                href={displayUrl}
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
          {resolving && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin" />
              <p className="text-sm">Preparing secure preview…</p>
            </div>
          )}
          {!resolving && resolveError && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="w-16 h-16 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-destructive mb-2">{resolveError}</p>
              <p className="text-xs text-muted-foreground">
                Court file exports are stored privately. Use Generate → Download on the case if this row is a court packet.
              </p>
            </div>
          )}
          {!resolving && !resolveError && displayUrl && isImage && (
            <img
              src={displayUrl}
              alt={document.title}
              className="max-w-full h-auto rounded-lg mx-auto block"
            />
          )}
          {!resolving && !resolveError && displayUrl && isPdf && (
            <iframe
              src={displayUrl}
              className="w-full h-[60vh] rounded-lg border border-border"
              title={document.title}
            />
          )}
          {!resolving && !resolveError && displayUrl && !isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-sm mb-4">
                Preview not available for this file type (.{ext || 'unknown'})
              </p>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                <Download className="w-4 h-4" /> Open / Download File
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

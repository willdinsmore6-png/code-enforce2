import { base44 } from '@/api/base44Client';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';

/** Public bucket paths can be opened without a signed URL. */
export function isLikelyPublicFileUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\/files\/[^/]*\/public\//i.test(url) || /\/mp\/public\//i.test(url);
}

/**
 * Temporary download/view URL for a Document row. Uses getCourtFilePDF (any document type).
 */
export async function getDocumentSignedUrl(user, impersonatedMunicipality, documentId) {
  const res = await base44.functions.invoke(
    'getCourtFilePDF',
    mergeActingTownPayload(user, impersonatedMunicipality, { document_id: documentId })
  );
  const url = res.data?.signed_url;
  if (!url) throw new Error(res.data?.error || 'Could not get file link');
  return { signedUrl: url, filename: res.data?.filename };
}

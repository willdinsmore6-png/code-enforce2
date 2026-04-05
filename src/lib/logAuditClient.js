import { base44 } from '@/api/base44Client';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';

/**
 * Resolves municipality id for AuditLog.town_id (Admin Tools filters on this).
 * Case rows may store town_id on the root or under data.
 */
export function auditTownId(caseRecord, municipality) {
  const fromCase = caseRecord?.town_id ?? caseRecord?.data?.town_id ?? '';
  const s = String(fromCase || municipality?.id || '').trim();
  return s;
}

export async function logAuditEntry(user, impersonatedMunicipality, payload) {
  return base44.functions.invoke('logAudit', mergeActingTownPayload(user, impersonatedMunicipality, payload));
}

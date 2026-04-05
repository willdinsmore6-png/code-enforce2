import { base44 } from '@/api/base44Client';

/**
 * Normalize `base44.functions.invoke` results: the SDK may resolve to a full Axios
 * response `{ data, status, ... }` or, if wrapped elsewhere, the JSON body only.
 */
export function unwrapFunctionInvokeResult(res) {
  if (res == null || typeof res !== 'object') return {};
  const body =
    typeof res.status === 'number' && res.data !== undefined ? res.data : res;
  return body && typeof body === 'object' ? body : {};
}

/** Same rules as the lookupCaseByCode function (spaces/dashes, uppercase). */
export function normalizePublicCode(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/[\s\-_]/g, '')
    .toUpperCase();
}

/** Read display/stored code from whatever shape Base44 returns. */
export function portalAccessCodeFromRecord(caseRecord) {
  if (!caseRecord) return '';
  const d = caseRecord.data || {};
  const v =
    caseRecord.public_access_code ||
    caseRecord.publicAccessCode ||
    d.public_access_code ||
    d.publicAccessCode;
  return String(v || '').trim();
}

function lookupVariants(primary) {
  const out = new Set([primary]);
  if (primary.includes('1')) out.add(primary.replace(/1/g, 'I'));
  if (primary.includes('I')) out.add(primary.replace(/I/g, '1'));
  if (primary.includes('0')) out.add(primary.replace(/0/g, 'O'));
  if (primary.includes('O')) out.add(primary.replace(/O/g, '0'));
  return [...out];
}

async function tryCaseFilter(query) {
  try {
    const rows = await base44.entities.Case.filter(query);
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export const PUBLIC_PORTAL_DOC_TYPES = [
  'nov',
  'citation',
  'abatement_proof',
  'court_filing',
  'correspondence',
  'other',
];

/**
 * When lookupCaseByCode (function) is missing or out of date, try entity filters in the browser.
 * Works only if Base44 RLS allows unauthenticated (or current session) Case reads for these filters.
 */
export async function lookupCaseByCodeViaEntities(normalizedCode) {
  if (!normalizedCode) return null;
  for (const tryCode of lookupVariants(normalizedCode)) {
    const queries = [
      { public_access_code: tryCode },
      { publicAccessCode: tryCode },
      { case_number: tryCode },
      { caseNumber: tryCode },
      { 'data.public_access_code': tryCode },
      { 'data.publicAccessCode': tryCode },
      { 'data.case_number': tryCode },
      { 'data.caseNumber': tryCode },
    ];
    for (const q of queries) {
      const hit = await tryCaseFilter(q);
      if (hit) return hit;
    }
  }
  return null;
}

export function mapEntityCaseToPortalSummary(c) {
  const d = c.data || {};
  return {
    id: c.id,
    town_id: c.town_id ?? d.town_id,
    case_number: c.case_number ?? c.caseNumber ?? d.case_number ?? d.caseNumber,
    status: c.status,
    property_address: c.property_address,
    violation_type: c.violation_type,
    specific_code_violated: c.specific_code_violated,
    abatement_deadline: c.abatement_deadline,
    zba_appeal_deadline: c.zba_appeal_deadline,
  };
}

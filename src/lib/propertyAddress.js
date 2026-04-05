/**
 * Canonical property key for matching enforcement cases to the same parcel (e.g. duplicate intake checks).
 * Not a legal substitute for assessor PID — use `parcel_id` when the town maintains it.
 */
export function normalizePropertyAddressKey(raw) {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .replace(/\b(STREET|ST|AVENUE|AVE|ROAD|RD|DRIVE|DR|LANE|LN|BOULEVARD|BLVD|COURT|CT|PLACE|PL)\b/g, (m) => {
      const map = {
        STREET: 'ST',
        ST: 'ST',
        AVENUE: 'AVE',
        AVE: 'AVE',
        ROAD: 'RD',
        RD: 'RD',
        DRIVE: 'DR',
        DR: 'DR',
        LANE: 'LN',
        LN: 'LN',
        BOULEVARD: 'BLVD',
        BLVD: 'BLVD',
        COURT: 'CT',
        CT: 'CT',
        PLACE: 'PL',
        PL: 'PL',
      };
      return map[m] || m;
    });
}

export function normalizeParcelKey(raw) {
  if (raw == null) return '';
  return String(raw).trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Returns cases in `candidates` whose address or parcel matches the given address / optional parcel id.
 */
export function filterRecordsForProperty(candidates, propertyAddress, parcelId) {
  const addrKey = normalizePropertyAddressKey(propertyAddress);
  const pid = normalizeParcelKey(parcelId);
  if (!addrKey && !pid) return [];
  return (candidates || []).filter((row) => {
    const a = normalizePropertyAddressKey(row.property_address || row.data?.property_address);
    const p = normalizeParcelKey(row.parcel_id || row.data?.parcel_id || row.map_parcel_id || row.data?.map_parcel_id);
    if (pid && p && p === pid) return true;
    if (addrKey && a && a === addrKey) return true;
    return false;
  });
}

const CLOSED_STATUS = new Set(['resolved', 'closed']);

export function isCaseConsideredOpen(c) {
  const s = String(c?.status || '').toLowerCase();
  return !CLOSED_STATUS.has(s);
}

function casePropertyAddress(c) {
  return String(c.property_address || c.data?.property_address || '').trim();
}

function caseParcelId(c) {
  return String(
    c.parcel_id || c.data?.parcel_id || c.map_parcel_id || c.data?.map_parcel_id || ''
  ).trim();
}

function sortCasesForSuggestions(a, b) {
  const ao = isCaseConsideredOpen(a) ? 0 : 1;
  const bo = isCaseConsideredOpen(b) ? 0 : 1;
  if (ao !== bo) return ao - bo;
  return String(b.created_date || '').localeCompare(String(a.created_date || ''));
}

/** Distinct property addresses from town cases, open / recent first. */
export function buildAddressSuggestionRows(cases, limit = 200) {
  const sorted = [...(cases || [])].sort(sortCasesForSuggestions);
  const byNorm = new Map();
  for (const c of sorted) {
    const label = casePropertyAddress(c);
    if (!label) continue;
    const nk = normalizePropertyAddressKey(label);
    if (!nk) continue;
    const pid = caseParcelId(c);
    const open = isCaseConsideredOpen(c);
    if (!byNorm.has(nk)) {
      byNorm.set(nk, { label, normKey: nk, parcel_id: pid || null, open });
    } else {
      const cur = byNorm.get(nk);
      if (!cur.parcel_id && pid) cur.parcel_id = pid;
      if (open) cur.open = true;
    }
  }
  return [...byNorm.values()].slice(0, limit);
}

/** Distinct parcel / map IDs from town cases, open / recent first. */
export function buildParcelSuggestionRows(cases, limit = 150) {
  const sorted = [...(cases || [])].sort(sortCasesForSuggestions);
  const byPid = new Map();
  for (const c of sorted) {
    const pid = caseParcelId(c);
    if (!pid) continue;
    const nk = normalizeParcelKey(pid);
    if (!nk) continue;
    const addr = casePropertyAddress(c);
    const open = isCaseConsideredOpen(c);
    if (!byPid.has(nk)) {
      byPid.set(nk, { label: pid, normKey: nk, addressHint: addr || null, open });
    } else {
      const cur = byPid.get(nk);
      if (!cur.addressHint && addr) cur.addressHint = addr;
      if (open) cur.open = true;
    }
  }
  return [...byPid.values()].slice(0, limit);
}

export function filterAddressRows(rows, query, max = 12) {
  const q = query.trim();
  const nq = normalizePropertyAddressKey(q);
  if (!q) {
    const openRows = rows.filter((r) => r.open);
    const pool = openRows.length > 0 ? openRows : rows;
    return pool.slice(0, max);
  }
  const ql = q.toLowerCase();
  return rows
    .filter((r) => r.label.toLowerCase().includes(ql) || (nq && r.normKey.includes(nq)))
    .slice(0, max);
}

export function filterParcelRows(rows, query, max = 12) {
  const q = query.trim();
  const nq = normalizeParcelKey(q);
  if (!q) {
    const openRows = rows.filter((r) => r.open);
    const pool = openRows.length > 0 ? openRows : rows;
    return pool.slice(0, max);
  }
  const ql = q.toLowerCase();
  return rows
    .filter((r) => r.label.toLowerCase().includes(ql) || (nq && r.normKey.includes(nq)))
    .slice(0, max);
}

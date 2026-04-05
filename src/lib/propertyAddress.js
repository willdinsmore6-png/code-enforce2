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
}/**
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

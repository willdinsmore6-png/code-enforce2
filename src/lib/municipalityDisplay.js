/**
 * TownConfig sometimes had placeholder product names; normalize for nav chrome only.
 * Compares alphanumeric-only so "Code Enforce Pro", "CodeEnforce Pro", "code-enforce pro" match.
 */
const LEGACY_PRODUCT_KEY = 'codeenforcepro';

function nameKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function municipalityNavTitle(municipality) {
  const raw = (municipality?.short_name || municipality?.town_name || '').trim();
  if (!raw) return 'Code Enforce';
  if (nameKey(raw) === LEGACY_PRODUCT_KEY) return 'Code Enforce';
  return raw;
}

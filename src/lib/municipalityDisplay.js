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

/** Public `icon.svg` with correct path when Vite `base` is not `/` (e.g. Base44 preview). */
export function appIconSrc() {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}icon.svg`;
}

/**
 * Base44 login / favicon uses the app logo from dashboard settings; `public-settings` exposes it for the SPA.
 * Field names vary by API version — try common shapes.
 */
export function appLogoUrlFromPublicSettings(settings) {
  if (!settings || typeof settings !== 'object') return '';
  const s = settings;
  const d = s.data && typeof s.data === 'object' ? s.data : {};
  const candidates = [
    typeof s.logo === 'string' ? s.logo : '',
    s.logo_url,
    s.logoUrl,
    s.app_logo_url,
    s.app_icon_url,
    s.icon_url,
    s.favicon_url,
    s.image_url,
    s.branding?.logo_url,
    s.branding?.icon_url,
    s.app?.logo_url,
    s.app?.icon_url,
    typeof d.logo === 'string' ? d.logo : '',
    d.logo_url,
    d.icon_url,
    d.favicon_url,
    d.app_logo_url,
    d.app_icon_url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

/** Sidebar / mobile header: town logo, else Base44 app logo from public-settings, else bundled icon. */
export function navHeaderLogoSrc(municipality, appPublicSettings) {
  const town = (municipality?.logo_url || '').trim();
  if (town) return town;
  const app = appLogoUrlFromPublicSettings(appPublicSettings);
  if (app) return app;
  return appIconSrc();
}

export function navHeaderLogoAlt(municipality, appPublicSettings) {
  if ((municipality?.logo_url || '').trim()) {
    return municipality?.short_name || municipality?.town_name
      ? `${municipality.short_name || municipality.town_name} logo`
      : 'Municipality logo';
  }
  if (appLogoUrlFromPublicSettings(appPublicSettings)) {
    const n = appPublicSettings?.name || appPublicSettings?.app_name || appPublicSettings?.title;
    return typeof n === 'string' && n.trim() ? `${n.trim()} logo` : 'Application logo';
  }
  return '';
}

/**
 * Superadmin global shell has no TownConfig; avoid "Municipal compliance" there.
 */
export function navTagline(municipality, isSuperadminShell) {
  if (isSuperadminShell && !municipality) return 'Global administration';
  if (municipality?.tagline) return municipality.tagline;
  if (municipality) return `${municipality.state} Code Enforcement`;
  return 'Municipal compliance';
}

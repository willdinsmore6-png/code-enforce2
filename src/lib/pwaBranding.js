import { appIconSrc, coercePwaInstallTitle } from '@/lib/municipalityDisplay';

let manifestBlobUrl = null;

/** public-settings payload shape varies; collect display name from common root and nested paths. */
function pickAppDisplayName(settings) {
  if (!settings || typeof settings !== 'object') return '';
  const s = settings;
  const d = s.data && typeof s.data === 'object' ? s.data : {};
  const candidates = [
    s.name,
    s.app_name,
    s.title,
    s.display_name,
    s.app_display_name,
    s.application_name,
    d.name,
    d.app_name,
    d.title,
    d.display_name,
    s.app?.name,
    s.app?.display_name,
    s.app?.title,
    d.app?.name,
    s.branding?.name,
    s.branding?.app_name,
    d.branding?.name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function pickAppShortName(settings) {
  if (!settings || typeof settings !== 'object') return '';
  const s = settings;
  const d = s.data && typeof s.data === 'object' ? s.data : {};
  const candidates = [
    s.short_name,
    s.shortName,
    s.app_short_name,
    d.short_name,
    s.app?.short_name,
    d.app?.short_name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function guessImageMime(url) {
  const u = String(url).toLowerCase().split('?')[0];
  if (u.endsWith('.svg')) return 'image/svg+xml';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.ico')) return 'image/x-icon';
  if (u.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function absoluteAppBase() {
  const base = import.meta.env.BASE_URL || '/';
  return new URL(base, window.location.origin).href;
}

/** Names for manifest / home screen; never surface legacy "Code Enforce Pro" in install UI. */
export function appDisplayNameFromPublicSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { name: 'Code Enforce', shortName: 'Code Enforce' };
  }
  const picked = pickAppDisplayName(settings);
  const name = coercePwaInstallTitle(picked || 'Code Enforce');
  const shortExplicit = pickAppShortName(settings);
  const shortName = shortExplicit ? coercePwaInstallTitle(shortExplicit) : name;
  return { name: name || 'Code Enforce', shortName: shortName || 'Code Enforce' };
}

/**
 * Install / Add to Home Screen icon: municipal logo if set, else same bundled icon.svg as index.html / tab
 * (not public-settings artwork — that URL often differed and looked wrong next to the tab).
 */
export function pwaInstallIconUrl(municipality) {
  const town = (municipality?.logo_url || '').trim();
  if (town) return town;
  return new URL(appIconSrc(), window.location.origin).href;
}

const STATIC_MANIFEST_HREF = `${import.meta.env.BASE_URL || '/'}manifest.json?v=pwa-branding-dynamic`;

/**
 * Web app manifest + apple-touch-icon: tab/bundled icon (or town logo) + coerced install title.
 * Pass municipality === null && appPublicSettings === null from effect cleanup to restore static manifest.
 */
export function syncPwaInstallBranding(municipality, appPublicSettings) {
  const manifestLink = document.querySelector('link[rel="manifest"]');

  if (manifestBlobUrl) {
    URL.revokeObjectURL(manifestBlobUrl);
    manifestBlobUrl = null;
  }

  if (municipality == null && appPublicSettings == null) {
    if (manifestLink) manifestLink.setAttribute('href', STATIC_MANIFEST_HREF);
    const apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple?.dataset?.pwaDynamic === '1') apple.remove();
    return;
  }

  const iconUrl = pwaInstallIconUrl(municipality);
  const { name, shortName } = appDisplayNameFromPublicSettings(appPublicSettings);

  const mime = guessImageMime(iconUrl);
  const sizes = mime === 'image/svg+xml' ? 'any' : '512x512';
  const manifest = {
    name,
    short_name: shortName,
    description: 'Municipal code enforcement — cases, deadlines, court tools, and public portal.',
    start_url: absoluteAppBase(),
    scope: absoluteAppBase(),
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#2563eb',
    icons: [{ src: iconUrl, sizes, type: mime, purpose: 'any' }],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  manifestBlobUrl = URL.createObjectURL(blob);
  if (manifestLink) manifestLink.setAttribute('href', manifestBlobUrl);

  let apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.setAttribute('href', iconUrl);
  apple.dataset.pwaDynamic = '1';

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute('content', shortName);
}

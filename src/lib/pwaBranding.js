import { appLogoUrlFromPublicSettings } from '@/lib/municipalityDisplay';

let manifestBlobUrl = null;

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

/** Names for manifest / home screen (Base44 dashboard app name when present). */
export function appDisplayNameFromPublicSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { name: 'Code Enforce', shortName: 'Code Enforce' };
  }
  const s = settings;
  const d = s.data && typeof s.data === 'object' ? s.data : {};
  const name = String(
    s.name || s.app_name || s.title || s.display_name || d.name || d.app_name || 'Code Enforce'
  ).trim();
  const shortRaw = String(
    s.short_name || s.shortName || s.app_short_name || d.short_name || name
  ).trim();
  const shortName = shortRaw.length > 12 ? shortRaw.slice(0, 12) : shortRaw;
  return { name: name || 'Code Enforce', shortName: shortName || name || 'Code Enforce' };
}

/** Town branding wins over Base44 app logo for install icon (same as nav). */
export function pwaInstallIconUrl(municipality, appPublicSettings) {
  const town = (municipality?.logo_url || '').trim();
  if (town) return town;
  return appLogoUrlFromPublicSettings(appPublicSettings) || '';
}

const STATIC_MANIFEST_HREF = `${import.meta.env.BASE_URL || '/'}manifest.json?v=pwa-branding-dynamic`;

/**
 * Point web app manifest + apple-touch-icon at the same logo URL used on Base44 login.
 * Re-run when public-settings or town logo changes so “Install app” picks up new artwork.
 */
export function syncPwaInstallBranding(municipality, appPublicSettings) {
  const iconUrl = pwaInstallIconUrl(municipality, appPublicSettings);
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const { name, shortName } = appDisplayNameFromPublicSettings(appPublicSettings);

  if (manifestBlobUrl) {
    URL.revokeObjectURL(manifestBlobUrl);
    manifestBlobUrl = null;
  }

  if (!iconUrl) {
    if (manifestLink) manifestLink.setAttribute('href', STATIC_MANIFEST_HREF);
    const apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple?.dataset?.pwaDynamic === '1') apple.remove();
    return;
  }

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

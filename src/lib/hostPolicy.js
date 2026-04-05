/**
 * Split hosting: marketing site on code-enforce.com, Base44 app on www.code-enforcepro.com (configurable).
 */

const DEFAULT_MARKETING_ONLY_HOSTS = ['code-enforce.com', 'www.code-enforce.com'];

/** Where the real app + login live (no trailing slash). */
const DEFAULT_APP_ORIGIN = 'https://www.code-enforcepro.com';

export function getConfiguredAppOrigin() {
  const env = import.meta.env.VITE_APP_ORIGIN;
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/$/, '');
  }
  return DEFAULT_APP_ORIGIN.replace(/\/$/, '');
}

/** True when this build should run as static marketing only (no Base44 bootstrap). */
export function isMarketingOnlyHost(hostname) {
  const h = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const extra = import.meta.env.VITE_MARKETING_ONLY_HOSTS;
  const list = extra
    ? extra.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MARKETING_ONLY_HOSTS;
  return list.includes(h);
}

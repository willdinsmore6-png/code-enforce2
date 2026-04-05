/** Staff home after sign-in (matches App router). */
export const STAFF_HOME_PATH = '/';

/**
 * True when the app is running as an installed PWA (home screen / dock).
 * In that case we always send OAuth return URL to the dashboard so installs open into the app shell.
 */
export function isInstalledPwa() {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.bind(window);
  if (mq) {
    if (mq('(display-mode: standalone)').matches) return true;
    if (mq('(display-mode: fullscreen)').matches) return true;
    if (mq('(display-mode: minimal-ui)').matches) return true;
  }
  return window.navigator.standalone === true;
}

/**
 * Origin for post-login redirect when in standalone PWA.
 * Set VITE_CANONICAL_APP_ORIGIN=https://www.code-enforce.com in production if installs should always return there
 * (only use if your auth provider allows that redirect origin).
 */
function pwaReturnOrigin() {
  const canonical = import.meta.env.VITE_CANONICAL_APP_ORIGIN;
  if (canonical && /^https?:\/\//i.test(canonical)) {
    return canonical.replace(/\/$/, '');
  }
  return window.location.origin;
}

/**
 * URL passed to Base44 `redirectToLogin` so after OAuth the user lands in the right place.
 * - Installed PWA → canonical or current origin + staff home (/)
 * - Browser tab → current page (unchanged behavior)
 */
export function getPostLoginReturnUrl() {
  if (typeof window === 'undefined') return STAFF_HOME_PATH;
  if (isInstalledPwa()) {
    return `${pwaReturnOrigin()}${STAFF_HOME_PATH}`;
  }
  return window.location.href;
}

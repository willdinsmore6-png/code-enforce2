/**
 * Single source of truth for auth / subscription routing.
 * Prevents duplicate redirects (AuthContext + App + SubscriptionGate fighting).
 */

function normalizePath(pathname) {
  if (!pathname) return '/';
  let p = pathname;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/** Routes that do not require an active town or paid subscription (incl. marketing home). */
export const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/welcome',
  '/public-portal',
  '/report',
  '/subscribe',
  '/success',
  '/onboarding',
];

export function isPublicAppPath(pathname) {
  const p = normalizePath(pathname);
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/**
 * Skip Base44 public-settings fetch and user bootstrap (same idea as the old public-portal-only shortcut).
 * On some Base44 deployments the anonymous public-settings call returns 403 / auth_required, which
 * breaks prospect pages like /welcome before React can render.
 */
export function shouldSkipAuthBootstrap(pathname) {
  const p = normalizePath(pathname);
  if (p === '/') return true;
  const prefixes = ['/welcome', '/public-portal'];
  return prefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export function isTownInactive(municipality) {
  if (!municipality) return false;
  return !(
    String(municipality.is_active).toLowerCase() === 'true' ||
    municipality.is_active === true
  );
}

export function userHasNoTown(user) {
  return !user?.town_id || user.town_id === 'Null';
}

/** Logged-in user with no town — not the marketing `/` (they are redirected to app then onboarding). */
export function isUnassignedAllowedPath(pathname) {
  const p = normalizePath(pathname);
  const prefixes = ['/welcome', '/public-portal', '/report', '/subscribe', '/success', '/onboarding'];
  return prefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Inactive subscription: same as public — paywall lives at /subscribe. */
export function isInactiveSubscriptionAllowedPath(pathname) {
  return isPublicAppPath(pathname);
}

/** Full-screen auth errors — do not run global redirects (would fight the screen). */
export function isBlockingAuthError(authError) {
  if (!authError?.type) return false;
  return ['user_not_registered', 'unassigned_user', 'pending_approval'].includes(authError.type);
}

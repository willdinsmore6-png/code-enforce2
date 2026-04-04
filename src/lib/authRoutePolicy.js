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

/** Routes that do not require an active town or paid subscription. */
export const PUBLIC_ROUTE_PREFIXES = [
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

/** Logged-in user with no town may only use public flows (incl. onboarding instructions). */
export function isUnassignedAllowedPath(pathname) {
  return isPublicAppPath(pathname);
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

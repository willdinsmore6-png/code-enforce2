/**
 * Append `acting_town_id` for superadmin impersonation so server functions can enforce
 * municipality-scoped access. See `functions/shared/actingTownGuard.ts`.
 */
export function mergeActingTownPayload(user, impersonatedMunicipality, payload = {}) {
  if (user?.role === 'superadmin' && impersonatedMunicipality?.id) {
    return { ...payload, acting_town_id: impersonatedMunicipality.id };
  }
  return { ...payload };
}

/**
 * Superadmin dashboard mutations must ignore impersonation so you can manage all towns/users.
 * Do not attach acting_town_id.
 */
export function superadminDashboardPayload(payload = {}) {
  return { ...payload };
}

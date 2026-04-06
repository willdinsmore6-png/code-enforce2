/**
 * When a superadmin sends `acting_town_id` (client: impersonating a municipality),
 * operations must only affect resources in that town. Omit `acting_town_id` for
 * full superadmin (global) access.
 */

export type BodyWithActing = { acting_town_id?: string };

function normalizeTownId(v: string | null | undefined): string {
  if (v == null) return '';
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'null') return '';
  return s;
}

export function checkActingTownAccess(
  user: { role?: string },
  body: BodyWithActing,
  resourceTownId: string | null | undefined
): Response | null {
  if (user.role !== 'superadmin') return null;
  const acting = typeof body.acting_town_id === 'string' ? body.acting_town_id.trim() : '';
  if (!acting) return null;
  const rt = normalizeTownId(resourceTownId);
  // Unassigned users have no town — allow superadmin (incl. when impersonating) to assign them.
  if (!rt) return null;
  if (rt !== acting) {
    return Response.json(
      { error: 'Forbidden: not allowed outside the active municipality context' },
      { status: 403 }
    );
  }
  return null;
}

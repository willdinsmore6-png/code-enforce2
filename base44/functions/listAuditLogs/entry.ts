import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normTownId(v: unknown): string {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null') return '';
  return s;
}

function caseTownId(c: Record<string, unknown>): string {
  return normTownId(c.town_id ?? (c.data as { town_id?: string } | undefined)?.town_id);
}

/**
 * Returns merged audit log rows for a municipality using the service role (same as getUsers).
 * Client-side AuditLog queries are subject to RLS: rows with missing town_id ("orphans") are only
 * visible to superadmin, so town admins would see incomplete history without this endpoint.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const requestedTownId = normTownId(body.town_id);
    const actingTownId = normTownId(body.acting_town_id);
    const userTownId = normTownId(
      user.town_id ?? (user as { data?: { town_id?: string } }).data?.town_id
    );

    let townId = '';

    if (user.role === 'superadmin') {
      if (actingTownId) {
        townId = actingTownId;
      } else if (requestedTownId) {
        townId = requestedTownId;
      }
    } else {
      townId = userTownId;
      if (!townId) {
        return Response.json({ logs: [] });
      }
      if (requestedTownId && requestedTownId !== townId) {
        return Response.json({ error: 'Forbidden: town scope mismatch' }, { status: 403 });
      }
    }

    if (!townId) {
      return Response.json({ logs: [] });
    }

    const sr = base44.asServiceRole;

    const [byTown, caseRowsRoot, caseRowsData] = await Promise.all([
      sr.entities.AuditLog.filter({ town_id: townId }, '-timestamp', 2500),
      sr.entities.Case.filter({ town_id: townId }, '-created_date', 6000).catch(() => []),
      sr.entities.Case.filter({ 'data.town_id': townId }, '-created_date', 6000).catch(() => []),
    ]);

    const caseById = new Map<string, Record<string, unknown>>();
    for (const c of [...(caseRowsRoot || []), ...(caseRowsData || [])]) {
      const row = c as Record<string, unknown>;
      if (row?.id && caseTownId(row) === townId) caseById.set(String(row.id), row);
    }
    const caseIds = new Set(caseById.keys());

    let recent: Record<string, unknown>[] = [];
    try {
      recent = (await sr.entities.AuditLog.list('-timestamp', 4000)) || [];
    } catch {
      recent = [];
    }

    const orphans = recent.filter(
      (l: Record<string, unknown>) =>
        Boolean(l.case_id) &&
        (!normTownId(l.town_id) || String(l.town_id).trim() === '') &&
        caseIds.has(String(l.case_id))
    );

    const map = new Map<string, Record<string, unknown>>();
    for (const l of [...(byTown || []), ...orphans]) {
      if (l?.id) map.set(String(l.id), l as Record<string, unknown>);
    }
    const merged = [...map.values()].sort(
      (a, b) =>
        new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime()
    );

    return Response.json({ logs: merged });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

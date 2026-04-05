import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { checkActingTownAccess } from '../shared/actingTownGuard/entry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { case_id, zoning_determination_id, case_number, entity_type, entity_id, action, changes } = body;

    let town_id = typeof body.town_id === 'string' ? body.town_id : '';

    if (case_id) {
      const rows = await base44.asServiceRole.entities.Case.filter({ id: case_id });
      const c = rows?.[0] as Record<string, unknown> | undefined;
      if (c) {
        const cTown =
          String(c.town_id || (c.data as { town_id?: string } | undefined)?.town_id || '').trim();
        if (user.role === 'superadmin') {
          const denied = checkActingTownAccess(user, body, cTown || undefined);
          if (denied) return denied;
        }
        if (!town_id) town_id = cTown;
      }
    }

    if (zoning_determination_id) {
      const zrows = await base44.asServiceRole.entities.ZoningDetermination.filter({
        id: zoning_determination_id,
      });
      const zd = zrows?.[0] as Record<string, unknown> | undefined;
      if (zd) {
        const zTown =
          String(zd.town_id || (zd.data as { town_id?: string } | undefined)?.town_id || '').trim();
        if (user.role === 'superadmin') {
          const denied = checkActingTownAccess(user, body, zTown || undefined);
          if (denied) return denied;
        }
        if (!town_id) town_id = zTown;
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      case_id: case_id || '',
      zoning_determination_id: zoning_determination_id || '',
      town_id: town_id || '',
      case_number: case_number || '',
      entity_type,
      entity_id: entity_id || '',
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      changes: typeof changes === 'object' ? JSON.stringify(changes) : (changes || ''),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

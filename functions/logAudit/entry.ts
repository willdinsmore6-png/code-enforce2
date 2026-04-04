import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { checkActingTownAccess } from '../shared/actingTownGuard.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { case_id, case_number, entity_type, entity_id, action, changes } = body;

    if (case_id && user.role === 'superadmin') {
      const rows = await base44.asServiceRole.entities.Case.filter({ id: case_id });
      const c = rows?.[0];
      if (c) {
        const denied = checkActingTownAccess(user, body, c.town_id);
        if (denied) return denied;
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      case_id,
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
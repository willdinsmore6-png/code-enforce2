import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { checkActingTownAccess } from '../shared/actingTownGuard/entry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;
    if (!userId || !role) return Response.json({ error: 'userId and role required' }, { status: 400 });

    const targets = await base44.asServiceRole.entities.User.filter({ id: userId });
    const target = targets?.[0];
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const targetTown = target.town_id || target.data?.town_id;
    const actingDenied = checkActingTownAccess(user, body, targetTown);
    if (actingDenied) return actingDenied;

    await base44.asServiceRole.entities.User.update(userId, { role });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
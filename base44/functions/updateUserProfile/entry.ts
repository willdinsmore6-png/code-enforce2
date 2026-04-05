import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { checkActingTownAccess } from '../shared/actingTownGuard/entry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as {
      userId?: string;
      full_name?: string;
      phone?: string;
      title?: string;
      acting_town_id?: string;
    };

    const { userId, full_name, phone, title } = body;
    const targetId = userId && me.role === 'superadmin' ? userId : me.id;

    if (userId && userId !== me.id && me.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targets = await base44.asServiceRole.entities.User.filter({ id: targetId });
    const target = targets?.[0];
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const targetTown = target.town_id || (target as { data?: { town_id?: string } }).data?.town_id;
    const actingDenied = checkActingTownAccess(me, body, targetTown);
    if (actingDenied) return actingDenied;

    const patch: Record<string, unknown> = {};
    if (full_name !== undefined) patch.full_name = typeof full_name === 'string' ? full_name.trim() : full_name;
    if (phone !== undefined) patch.phone = typeof phone === 'string' ? phone.trim() : phone;
    if (title !== undefined) patch.title = typeof title === 'string' ? title.trim() : title;

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(targetId, patch);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

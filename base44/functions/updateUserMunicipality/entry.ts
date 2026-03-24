import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { user_id, municipality_id, municipality_name } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });

    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (!users[0]) return Response.json({ error: 'User not found' }, { status: 404 });

    await base44.asServiceRole.entities.User.update(user_id, {
      municipality_id: municipality_id || null,
      municipality_name: municipality_name || null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
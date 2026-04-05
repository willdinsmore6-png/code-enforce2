import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Superadmin role required' }, { status: 403 });
    }

    const { userId, townId } = await req.json();
    if (!userId || !townId) {
      return Response.json({ error: 'userId and townId are required' }, { status: 400 });
    }

    // Update the user's town_id
    await base44.asServiceRole.entities.User.update(userId, { town_id: townId });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
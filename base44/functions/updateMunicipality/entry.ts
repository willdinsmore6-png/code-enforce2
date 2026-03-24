import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = user.role === 'superadmin';

    const body = await req.json();
    const { municipality_id, ...updateData } = body;

    if (!municipality_id) {
      return Response.json({ error: 'municipality_id is required' }, { status: 400 });
    }

    // Superadmins can update any municipality; others can only update their own
    if (!isSuperAdmin && user.municipality_id !== municipality_id) {
      return Response.json({ error: 'Forbidden: you can only update your own municipality' }, { status: 403 });
    }

    const municipality = await base44.asServiceRole.entities.Municipality.update(municipality_id, updateData);

    return Response.json({ municipality });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
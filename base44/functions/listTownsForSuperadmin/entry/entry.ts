import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Returns all TownConfig rows (service role). Superadmin only.
 * Client TownConfig.list() can be empty depending on platform RLS for list queries.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const towns = await base44.asServiceRole.entities.TownConfig.list('-created_date', 500);
    return Response.json({ towns: towns || [] });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

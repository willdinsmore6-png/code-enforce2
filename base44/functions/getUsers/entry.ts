import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { town_id: requestedTownId } = await req.json().catch(() => ({}));

    let users = await base44.asServiceRole.entities.User.list();

    // Exclude the hardcoded build account
    users = users.filter(u => u.email !== 'will@buildwithme.biz');

    // Filter by town: use requested town if provided (for superadmin impersonation), otherwise use user's town
    const filterTown = requestedTownId || user.town_id || user.data?.town_id;
    if (filterTown) {
      users = users.filter(u => {
        const userTown = u.town_id || u.data?.town_id;
        return userTown === filterTown;
      });
    }

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
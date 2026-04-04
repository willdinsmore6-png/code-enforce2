import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // 1. Basic Security Check
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Safely parse the "all: true" flag from the frontend
    let params = {};
    try {
      const body = await req.json();
      params = body || {};
    } catch (e) {
      params = {}; // Handle empty requests
    }

    const { town_id: requestedTownId, all: showAll, acting_town_id: actingTownId } = params;

    // 3. Fetch EVERYONE using the Service Role (Bypasses all RLS)
    let users = await base44.asServiceRole.entities.User.list();

    // 4. Filter the list based on the request
    if (user.role === 'superadmin' && actingTownId) {
      // Impersonation: scope to the active municipality only (strongest filter)
      users = users.filter(u => (u.town_id || u.data?.town_id) === actingTownId);
    } else if (showAll === true && user.role === 'superadmin') {
      console.log(`SuperAdmin viewing all users`);
    } else if (requestedTownId) {
      // Used for impersonation: only show users for that specific town
      users = users.filter(u => (u.town_id || u.data?.town_id) === requestedTownId);
    } else if (user.town_id && user.town_id !== 'Null') {
      // Default: only show users in the same town as the logged-in admin
      users = users.filter(u => (u.town_id || u.data?.town_id) === user.town_id);
    } else {
      // Show unassigned users if the admin has no town set
      users = users.filter(u => !u.town_id || u.town_id === 'Null');
    }

    // Exclude the system build account from the list
    users = users.filter(u => u.email !== 'will@buildwithme.biz');

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

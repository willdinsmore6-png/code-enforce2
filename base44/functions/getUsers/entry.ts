import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Read the params sent from the frontend
    const { town_id: requestedTownId, all: showAll } = await req.json().catch(() => ({}));

    // Grab EVERYONE using Service Role bypass
    let users = await base44.asServiceRole.entities.User.list();

    // Exclude the build account
    users = users.filter(u => u.email !== 'will@buildwithme.biz');

    // --- LOGIC CHANGE START ---
    
    // 1. If 'all' is true and user is superadmin, do NO filtering (Show Everyone)
    if (showAll && user.role === 'superadmin') {
      // Do nothing, keep the full list
    } 
    // 2. If a specific town is requested (Impersonation), filter by that town
    else if (requestedTownId) {
      users = users.filter(u => (u.town_id || u.data?.town_id) === requestedTownId);
    } 
    // 3. Otherwise, default to the user's own town (Standard Admin view)
    else if (user.town_id && user.town_id !== 'Null') {
      users = users.filter(u => (u.town_id || u.data?.town_id) === user.town_id);
    }

    // --- LOGIC CHANGE END ---

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

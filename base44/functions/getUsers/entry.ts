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
    let params: Record<string, unknown> = {};
    try {
      const body = await req.json();
      params = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    } catch (_e) {
      params = {};
    }

    const requestedTownId = params.town_id as string | undefined;
    const showAll = params.all;
    const actingTownId = params.acting_town_id as string | undefined;

    const wantAllUsers =
      showAll === true ||
      showAll === 'true' ||
      showAll === 1 ||
      showAll === '1';

    // 3. Fetch EVERYONE using the Service Role (Bypasses all RLS)
    let users = await base44.asServiceRole.entities.User.list();

    // 4. Filter the list based on the request
    if (user.role === 'superadmin' && actingTownId) {
      // Impersonation: scope to the active municipality only (strongest filter)
      users = users.filter((u) => (u.town_id || u.data?.town_id) === actingTownId);
    } else if (wantAllUsers && user.role === 'superadmin') {
      // all users
    } else if (requestedTownId) {
      // Client sends town_id for Admin Tools (incl. superadmin preview / dropdown scope)
      users = users.filter((u) => (u.town_id || u.data?.town_id) === requestedTownId);
    } else if (user.town_id && user.town_id !== 'Null') {
      // Default: only show users in the same town as the logged-in admin
      users = users.filter((u) => (u.town_id || u.data?.town_id) === user.town_id);
    } else if (user.role === 'superadmin') {
      // Superadmin must pass town_id, acting_town_id, or all — avoid misleading unassigned-only list
      users = [];
    } else {
      // Town admin with no town_id: unassigned users only
      users = users.filter((u) => !u.town_id || u.town_id === 'Null');
    }

    // Exclude the system build account from the list
    users = users.filter((u) => u.email !== 'will@buildwithme.biz');

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

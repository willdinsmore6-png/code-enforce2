import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let users = await base44.asServiceRole.entities.User.list();

    // Exclude the hardcoded build account
    users = users.filter(u => u.email !== 'will@buildwithme.biz');

    // Superadmins see all users; admins only see users in their town
    if (user.role === 'admin') {
      users = users.filter(u => u.town_id === user.town_id);
    }

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
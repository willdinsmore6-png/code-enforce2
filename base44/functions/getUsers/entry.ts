import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allUsers = await base44.asServiceRole.entities.User.list();

    let users;
    if (user.role === 'superadmin') {
      // Superadmin sees all users
      users = allUsers;
    } else if (user.municipality_id) {
      // Admins and staff only see their municipality's users
      users = allUsers.filter(u => u.municipality_id === user.municipality_id);
    } else {
      users = [];
    }

    // Exclude the hardcoded build account
    users = users.filter(u => u.email !== 'will@buildwithme.biz');

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
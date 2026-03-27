import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const { email, role, town_id } = await req.json();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    if (user.role === 'admin' && role === 'superadmin') {
      return Response.json({ error: 'Admins cannot invite Superadmins' }, { status: 403 });
    }

    // Determine the role to invite with (admins can only invite users)
    const inviteRole = user.role === 'superadmin' && role === 'admin' ? 'admin' : 'user';

    // Invite the user with appropriate role
    await base44.users.inviteUser(email, inviteRole);

    // Wait briefly for the user record to be created
    await new Promise(r => setTimeout(r, 2000));

    // Find the newly created user record and set town_id
    const allUsers = await base44.asServiceRole.entities.User.list();
    const newUser = allUsers.find(u => u.email === email);

    if (newUser) {
      const updates = {};
      const assignedTown = town_id || user.town_id || user.data?.town_id;
      if (assignedTown) updates.town_id = assignedTown;

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.User.update(newUser.id, updates);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
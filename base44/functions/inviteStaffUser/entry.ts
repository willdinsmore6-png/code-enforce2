import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return Response.json({ error: 'email and role are required' }, { status: 400 });
    }

    if (user.role === 'admin' && role === 'superadmin') {
      return Response.json({ error: 'Admins cannot invite Superadmins' }, { status: 403 });
    }

    // Invite the user (platform sets role to 'user' initially)
    await base44.users.inviteUser(email, 'user');

    // Wait briefly for the user record to be created
    await new Promise(r => setTimeout(r, 2000));

    // Find the newly created user record
    const allUsers = await base44.asServiceRole.entities.User.list();
    const newUser = allUsers.find(u => u.email === email);

    if (newUser) {
      const updates = {};
      if (role !== 'user') updates.role = role;
      // Automatically assign the inviting admin's town
      if (user.town_id) updates.town_id = user.town_id;

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.User.update(newUser.id, updates);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
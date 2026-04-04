import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
    }

    const { email, role, town_id } = await req.json();
    if (!email || !role) {
      return Response.json({ error: 'email and role are required' }, { status: 400 });
    }

    // Invite as default 'user' role first (platform restriction), then update role + town
    await base44.users.inviteUser(email, 'user');

    // Give a moment for the user record to be created
    await new Promise(r => setTimeout(r, 1500));
    const users = await base44.asServiceRole.entities.User.list();
    const newUser = users.find(u => u.email === email);

    if (newUser) {
      const updates = {};
      if (role !== 'user') updates.role = role;
      if (town_id) updates.town_id = town_id;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.User.update(newUser.id, updates);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
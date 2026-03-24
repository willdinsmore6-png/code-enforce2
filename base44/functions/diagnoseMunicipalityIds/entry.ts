import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 100);
    const municipalities = await base44.asServiceRole.entities.Municipality.list('-created_date', 100);

    const userDiagnostics = allUsers.map(u => ({
      email: u.email,
      municipality_id: u.municipality_id,
      type: u.municipality_id ? typeof u.municipality_id : null,
      isUUID: u.municipality_id && u.municipality_id.length === 36 && u.municipality_id.includes('-'),
      role: u.role,
    }));

    const muniDiagnostics = municipalities.map(m => ({
      id: m.id,
      name: m.name,
      short_name: m.short_name,
    }));

    return Response.json({
      users: userDiagnostics,
      municipalities: muniDiagnostics,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
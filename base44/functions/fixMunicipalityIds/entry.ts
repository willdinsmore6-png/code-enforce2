import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users and all municipalities
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const municipalities = await base44.asServiceRole.entities.Municipality.list('-created_date', 500);

    // Create a map of municipality names/short_names to IDs
    const muniMap = {};
    municipalities.forEach(m => {
      if (m.name) muniMap[m.name] = m.id;
      if (m.short_name) muniMap[m.short_name] = m.id;
    });

    // Find users with string municipality_ids that need fixing
    // (24-char hex = valid MongoDB ID, 36-char with hyphens = valid UUID, others = bad)
    const usersToFix = [];
    for (const u of allUsers) {
      if (u.municipality_id && typeof u.municipality_id === 'string') {
        const isValidMongoId = /^[0-9a-f]{24}$/.test(u.municipality_id);
        const isValidUuid = u.municipality_id.length === 36 && u.municipality_id.includes('-');
        if (isValidMongoId || isValidUuid) {
          continue; // Already a valid ID
        }
        // It's a name, look it up
        const correctId = muniMap[u.municipality_id];
        if (correctId) {
          usersToFix.push({ id: u.id, oldId: u.municipality_id, newId: correctId });
        }
      }
    }

    // Update each user
    for (const u of usersToFix) {
      await base44.asServiceRole.entities.User.update(u.id, { municipality_id: u.newId });
    }

    return Response.json({
      success: true,
      fixed: usersToFix.length,
      users: usersToFix
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
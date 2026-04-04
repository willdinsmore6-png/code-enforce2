import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * One-time migration: backfills town_id on all child entities
 * by looking up the parent Case's town_id.
 * Run once from Dashboard → Code → Functions → migrateTownIds
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'superadmin') {
    return Response.json({ error: 'Forbidden: superadmin only' }, { status: 403 });
  }

  const results = {};

  // Load all cases to build a lookup map
  const cases = await base44.asServiceRole.entities.Case.list('-created_date', 5000);
  const caseMap = {};
  for (const c of cases) {
    caseMap[c.id] = c.town_id || null;
  }

  const entitiesToMigrate = [
    'Investigation', 'Notice', 'Document', 'CourtAction', 'Deadline', 'AuditLog'
  ];

  for (const entityName of entitiesToMigrate) {
    let updated = 0;
    let skipped = 0;
    let noTown = 0;

    const records = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
    for (const record of records) {
      if (record.town_id) {
        skipped++;
        continue;
      }
      const townId = caseMap[record.case_id];
      if (!townId) {
        noTown++;
        continue;
      }
      await base44.asServiceRole.entities[entityName].update(record.id, { town_id: townId });
      updated++;
    }

    results[entityName] = { updated, skipped, noTown };
  }

  // Migrate Resources: assign town_id based on created_by user's town_id
  const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
  const userTownMap = {};
  for (const u of users) {
    if (u.email && u.town_id) userTownMap[u.email] = u.town_id;
  }

  let resUpdated = 0, resSkipped = 0, resNoTown = 0;
  const resources = await base44.asServiceRole.entities.Resource.list('-created_date', 10000);
  for (const r of resources) {
    if (r.town_id) { resSkipped++; continue; }
    const townId = userTownMap[r.created_by];
    if (!townId) { resNoTown++; continue; }
    await base44.asServiceRole.entities.Resource.update(r.id, { town_id: townId });
    resUpdated++;
  }
  results['Resource'] = { updated: resUpdated, skipped: resSkipped, noTown: resNoTown };

  return Response.json({ success: true, results });
});
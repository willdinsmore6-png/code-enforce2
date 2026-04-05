import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { checkActingTownAccess } from '../shared/actingTownGuard/entry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { case_id } = body;
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    let caseRow = null;
    if (user.role === 'superadmin') {
      caseRow = (await base44.asServiceRole.entities.Case.filter({ id: case_id }))?.[0] ?? null;
      if (!caseRow) {
        try {
          caseRow = await base44.asServiceRole.entities.Case.get(case_id);
        } catch { /* empty */ }
      }
      const actingDenied = checkActingTownAccess(user, body, caseRow?.town_id);
      if (actingDenied) return actingDenied;
    } else {
      const scoped = await base44.entities.Case.filter({ id: case_id });
      caseRow = scoped?.[0] ?? null;
    }

    if (!caseRow) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const db = base44.asServiceRole;
    const cid = caseRow.id;

    const [investigations, notices, documents, deadlines, courtActions] = await Promise.all([
      db.entities.Investigation.filter({ case_id: cid }),
      db.entities.Notice.filter({ case_id: cid }),
      db.entities.Document.filter({ case_id: cid }),
      db.entities.Deadline.filter({ case_id: cid }),
      db.entities.CourtAction.filter({ case_id: cid }),
    ]);

    await Promise.all([
      ...investigations.map(r => db.entities.Investigation.delete(r.id)),
      ...notices.map(r => db.entities.Notice.delete(r.id)),
      ...documents.map(r => db.entities.Document.delete(r.id)),
      ...deadlines.map(r => db.entities.Deadline.delete(r.id)),
      ...courtActions.map(r => db.entities.CourtAction.delete(r.id)),
    ]);

    await db.entities.Case.delete(cid);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

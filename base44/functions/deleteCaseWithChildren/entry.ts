import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id } = await req.json();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    const db = base44.asServiceRole;

    // Delete all children in parallel
    const [investigations, notices, documents, deadlines, courtActions] = await Promise.all([
      db.entities.Investigation.filter({ case_id }),
      db.entities.Notice.filter({ case_id }),
      db.entities.Document.filter({ case_id }),
      db.entities.Deadline.filter({ case_id }),
      db.entities.CourtAction.filter({ case_id }),
    ]);

    await Promise.all([
      ...investigations.map(r => db.entities.Investigation.delete(r.id)),
      ...notices.map(r => db.entities.Notice.delete(r.id)),
      ...documents.map(r => db.entities.Document.delete(r.id)),
      ...deadlines.map(r => db.entities.Deadline.delete(r.id)),
      ...courtActions.map(r => db.entities.CourtAction.delete(r.id)),
    ]);

    await db.entities.Case.delete(case_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
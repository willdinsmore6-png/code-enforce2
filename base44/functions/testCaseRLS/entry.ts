import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cases = await base44.entities.Case.list('-created_date', 100);

    return Response.json({ 
      user_town_id: user.town_id,
      cases_count: cases?.length || 0,
      cases: cases?.slice(0, 3) || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
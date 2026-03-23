import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.list();
    return Response.json({
      users: users.filter(u => u.email !== 'will@buildwithme.biz')
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
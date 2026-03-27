import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allCases = await base44.asServiceRole.entities.Case.list('-created_date', 1000);
    const missing = allCases.filter(c => !c.public_access_code);

    let updated = 0;
    for (const c of missing) {
      const code = generateCode();
      await base44.asServiceRole.entities.Case.update(c.id, { public_access_code: code });
      updated++;
    }

    return Response.json({ success: true, updated, total: allCases.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
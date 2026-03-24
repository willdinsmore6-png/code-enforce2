import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id, case_number, entity_type, entity_id, action, changes } = await req.json();

    await base44.asServiceRole.entities.AuditLog.create({
      case_id,
      case_number: case_number || '',
      entity_type,
      entity_id: entity_id || '',
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      changes: typeof changes === 'object' ? JSON.stringify(changes) : (changes || ''),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
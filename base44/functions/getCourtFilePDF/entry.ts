import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { checkActingTownAccess } from '../shared/actingTownGuard.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { document_id } = body;
    if (!document_id) return Response.json({ error: 'document_id is required' }, { status: 400 });

    // Fetch via user-scoped call so RLS enforces town-level access
    const docs = await base44.entities.Document.filter({ id: document_id });
    const docRecord = docs?.[0];

    if (!docRecord) {
      return Response.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    const actingDenied = checkActingTownAccess(user, body, docRecord.town_id);
    if (actingDenied) return actingDenied;

    if (!docRecord.file_url) {
      return Response.json({ error: 'No file associated with this document' }, { status: 400 });
    }

    // Generate a time-limited signed URL (5 minutes)
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: docRecord.file_url,
      expires_in: 300,
    });

    return Response.json({ success: true, signed_url, filename: docRecord.title });

  } catch (error) {
    console.error('getCourtFilePDF error:', error?.message);
    return Response.json({ error: error.message || 'Failed to get PDF' }, { status: 500 });
  }
});
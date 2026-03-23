import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { access_code } = await req.json();

    if (!access_code) {
      return Response.json({ error: 'Access code required' }, { status: 400 });
    }

    const results = await base44.asServiceRole.entities.Case.filter({
      public_access_code: access_code.trim().toUpperCase()
    });

    if (results.length === 0) {
      return Response.json({ found: false });
    }

    // Return only fields needed for the public portal (no sensitive internal data)
    const c = results[0];

    // Fetch documents (NOV types + owner-uploaded) and notices
    const [allDocs, allNotices] = await Promise.all([
      base44.asServiceRole.entities.Document.filter({ case_id: c.id }),
      base44.asServiceRole.entities.Notice.filter({ case_id: c.id }),
    ]);

    // Only show NOV/citation documents and abatement_proof (owner uploads)
    const publicDocTypes = ['nov', 'citation', 'abatement_proof', 'court_filing', 'correspondence', 'other'];
    const publicDocs = allDocs.filter(d => publicDocTypes.includes(d.document_type));

    return Response.json({
      found: true,
      case: {
        id: c.id,
        case_number: c.case_number,
        status: c.status,
        property_address: c.property_address,
        violation_type: c.violation_type,
        specific_code_violated: c.specific_code_violated,
        abatement_deadline: c.abatement_deadline,
        zba_appeal_deadline: c.zba_appeal_deadline,
      },
      notices: allNotices.map(n => ({
        id: n.id,
        notice_type: n.notice_type,
        date_issued: n.date_issued,
        delivery_method: n.delivery_method,
        delivery_confirmed: n.delivery_confirmed,
        rsa_cited: n.rsa_cited,
        abatement_deadline: n.abatement_deadline,
        appeal_deadline: n.appeal_deadline,
        appeal_instructions: n.appeal_instructions,
        notice_content: n.notice_content,
        document_url: n.document_url,
      })),
      documents: publicDocs.map(d => ({
        id: d.id,
        title: d.title,
        document_type: d.document_type,
        description: d.description,
        file_url: d.file_url,
        created_date: d.created_date,
        version: d.version,
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
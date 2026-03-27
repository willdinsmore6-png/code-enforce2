import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      property_address,
      violation_type,
      violation_description,
      complainant_name,
      complainant_contact,
      complainant_anonymous,
      photo_urls,
      town_id,
    } = body;

    if (!property_address || !violation_type || !violation_description) {
      return Response.json({ error: 'Address, violation type, and description are required.' }, { status: 400 });
    }

    // Generate case number
    const prefix = 'PUB';
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const case_number = `${prefix}-${year}-${rand}`;

    // Generate public access code
    const public_access_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Determine retention per RSA 33-A (court actions = 10yr, standard = 7yr)
    const retention_category = 'rsa_33a_7yr';
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);
    const retention_expires = retentionDate.toISOString().split('T')[0];

    const newCase = await base44.asServiceRole.entities.Case.create({
      case_number,
      public_access_code,
      town_id: town_id || null,
      status: 'pending_review',
      source: 'public_report',
      priority: 'medium',
      property_address,
      violation_type,
      violation_description,
      complainant_name: complainant_anonymous ? null : complainant_name,
      complainant_contact: complainant_anonymous ? null : complainant_contact,
      complainant_anonymous: !!complainant_anonymous,
      complaint_date: new Date().toISOString().split('T')[0],
      retention_category,
      retention_expires,
    });

    // If photos were uploaded, create document records
    if (photo_urls && photo_urls.length > 0) {
      const docPromises = photo_urls.map((url, i) =>
        base44.asServiceRole.entities.Document.create({
          case_id: newCase.id,
          title: `Public Report Photo ${i + 1}`,
          document_type: 'photo',
          file_url: url,
          description: 'Submitted via public complaint portal',
        })
      );
      await Promise.all(docPromises);
    }

    return Response.json({
      success: true,
      case_number,
      public_access_code,
      message: 'Your report has been submitted. Use your access code to track the status.',
    });
  } catch (error) {
    console.error('submitPublicReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
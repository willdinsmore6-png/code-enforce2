import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { allocateUniquePublicAccessCode } from '../shared/publicAccessCode/entry.ts';

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

    if (!town_id || typeof town_id !== 'string') {
      return Response.json(
        {
          error:
            'Municipality is required. Use the violation report link from your town’s website (it includes the correct town ID).',
        },
        { status: 400 }
      );
    }

    const towns = await base44.asServiceRole.entities.TownConfig.filter({ id: town_id });
    if (!towns?.[0]) {
      return Response.json({ error: 'Unknown or invalid municipality.' }, { status: 400 });
    }

    const prefix = 'PUB';
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const case_number = `${prefix}-${year}-${rand}`;

    const public_access_code = await allocateUniquePublicAccessCode(base44);

    const retention_category = 'rsa_33a_7yr';
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);
    const retention_expires = retentionDate.toISOString().split('T')[0];

    const newCase = await base44.asServiceRole.entities.Case.create({
      case_number,
      public_access_code,
      town_id,
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

    if (photo_urls && photo_urls.length > 0) {
      const docPromises = photo_urls.map((url: string, i: number) =>
        base44.asServiceRole.entities.Document.create({
          case_id: newCase.id,
          town_id,
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

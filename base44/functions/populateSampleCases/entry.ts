import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { randomPublicAccessCode } from '../shared/publicAccessCode.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();
    
    const townId = event.entity_id;
    if (!townId) {
      return Response.json({ error: 'No town ID provided' }, { status: 400 });
    }

    // Sample cases data
    const sampleCases = [
      {
        town_id: townId,
        case_number: 'DEMO-001',
        status: 'intake',
        complaint_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        property_address: '123 Main Street',
        property_owner_name: 'John Smith',
        property_owner_email: 'john@example.com',
        property_owner_phone: '603-555-0123',
        complainant_name: 'Jane Doe',
        complainant_anonymous: false,
        violation_type: 'junk_debris',
        violation_description: 'Excessive junk and debris in yard',
        priority: 'high',
        source: 'public_report',
      },
      {
        town_id: townId,
        case_number: 'DEMO-002',
        status: 'investigation',
        complaint_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        property_address: '456 Oak Avenue',
        property_owner_name: 'Robert Johnson',
        property_owner_email: 'robert@example.com',
        property_owner_phone: '603-555-0456',
        complainant_name: 'Anonymous',
        complainant_anonymous: true,
        violation_type: 'housing_condition',
        violation_description: 'Deteriorating structure and broken windows',
        priority: 'medium',
        source: 'internal',
      },
      {
        town_id: townId,
        case_number: 'DEMO-003',
        status: 'notice_sent',
        complaint_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        property_address: '789 Elm Street',
        property_owner_name: 'Sarah Williams',
        property_owner_email: 'sarah@example.com',
        property_owner_phone: '603-555-0789',
        complainant_name: 'Neighbor Report',
        complainant_anonymous: false,
        violation_type: 'zoning',
        violation_description: 'Unpermitted commercial use in residential zone',
        priority: 'medium',
        source: 'public_report',
      },
    ];

    // Create sample cases
    const createdCases = [];
    for (const caseData of sampleCases) {
      const createdCase = await base44.asServiceRole.entities.Case.create({
        ...caseData,
        public_access_code: randomPublicAccessCode(8),
      });
      createdCases.push(createdCase);
    }

    // Create sample investigations
    for (const caseItem of createdCases.slice(0, 2)) {
      await base44.asServiceRole.entities.Investigation.create({
        case_id: caseItem.id,
        town_id: townId,
        investigation_date: new Date().toISOString().split('T')[0],
        officer_name: 'Officer Demo',
        field_notes: 'Initial site inspection conducted. Violation confirmed.',
        violation_confirmed: true,
      });
    }

    // Create sample deadlines
    for (let i = 0; i < createdCases.length; i++) {
      const daysFromNow = (i + 1) * 15;
      const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await base44.asServiceRole.entities.Deadline.create({
        case_id: createdCases[i].id,
        town_id: townId,
        deadline_type: 'abatement',
        due_date: dueDate,
        description: 'Abatement deadline',
        priority: i === 0 ? 'high' : 'medium',
      });
    }

    // Create sample notices
    for (const caseItem of createdCases) {
      await base44.asServiceRole.entities.Notice.create({
        case_id: caseItem.id,
        town_id: townId,
        notice_type: 'first_nov',
        date_issued: new Date().toISOString().split('T')[0],
        delivery_method: 'certified_mail',
        recipient_name: caseItem.property_owner_name,
        recipient_address: caseItem.property_address,
      });
    }

    // Create sample court actions for the first case
    if (createdCases.length > 0) {
      await base44.asServiceRole.entities.CourtAction.create({
        case_id: createdCases[0].id,
        town_id: townId,
        action_type: 'hearing_scheduled',
        court_type: 'district_court',
        filing_date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
      });
    }

    return Response.json({ 
      success: true,
      created: {
        cases: createdCases.length,
        investigations: Math.min(2, createdCases.length),
        deadlines: createdCases.length,
        notices: createdCases.length,
        courtActions: 1,
      }
    });
  } catch (error) {
    console.error('Populate sample cases error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
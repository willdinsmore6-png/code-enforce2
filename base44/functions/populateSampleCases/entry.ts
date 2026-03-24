import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { municipality_id } = await req.json();

    if (!municipality_id) {
      return Response.json({ error: 'municipality_id required' }, { status: 400 });
    }

    const sampleCases = [
      {
        property_address: '123 Main Street',
        violation_type: 'zoning',
        violation_description: 'Illegal accessory structure without variance',
        specific_code_violated: 'RSA 674:21',
        status: 'intake',
        priority: 'high',
        municipality_id,
        case_number: 'SAMPLE-001',
      },
      {
        property_address: '456 Oak Avenue',
        violation_type: 'building_code',
        violation_description: 'Addition constructed without building permit',
        specific_code_violated: 'NH Building Code',
        status: 'investigation',
        priority: 'high',
        municipality_id,
        case_number: 'SAMPLE-002',
        assigned_officer: 'officer@example.com',
      },
      {
        property_address: '789 Elm Road',
        violation_type: 'setback',
        violation_description: 'Structure encroaches on required setback',
        specific_code_violated: 'Town Zoning Ordinance §4.2',
        status: 'notice_sent',
        priority: 'medium',
        municipality_id,
        case_number: 'SAMPLE-003',
        abatement_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        property_address: '321 Pine Lane',
        violation_type: 'use_violation',
        violation_description: 'Commercial use in residential zone',
        specific_code_violated: 'RSA 676:16',
        status: 'awaiting_response',
        priority: 'medium',
        municipality_id,
        case_number: 'SAMPLE-004',
        abatement_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        property_address: '654 Maple Drive',
        violation_type: 'junkyard',
        violation_description: 'Junkyard operation without permit',
        specific_code_violated: 'RSA 21:34-a',
        status: 'in_compliance',
        priority: 'urgent',
        municipality_id,
        case_number: 'SAMPLE-005',
        resolution_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        resolution_notes: 'Property owner removed all junk and materials',
      },
      {
        property_address: '987 Birch Court',
        violation_type: 'signage',
        violation_description: 'Oversized sign exceeds height restrictions',
        specific_code_violated: 'Town Sign Ordinance',
        status: 'citation_issued',
        priority: 'low',
        municipality_id,
        case_number: 'SAMPLE-006',
        compliance_path: 'citation_676_17b',
        daily_penalty_rate: 275,
      },
      {
        property_address: '147 Cedar Street',
        violation_type: 'septic',
        violation_description: 'Non-compliant septic system',
        specific_code_violated: 'NH DES Rules',
        status: 'court_action',
        priority: 'critical',
        municipality_id,
        case_number: 'SAMPLE-007',
        compliance_path: 'superior_court_676_15',
      },
      {
        property_address: '258 Walnut Place',
        violation_type: 'wetlands',
        violation_description: 'Unauthorized fill in wetland area',
        specific_code_violated: 'RSA 482-A',
        status: 'resolved',
        priority: 'high',
        municipality_id,
        case_number: 'SAMPLE-008',
        resolution_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        resolution_notes: 'Violation abated; property restored to compliance',
      },
    ];

    const created = [];
    for (const caseData of sampleCases) {
      const newCase = await base44.asServiceRole.entities.Case.create(caseData);
      created.push(newCase);
    }

    return Response.json({ success: true, cases_created: created.length });
  } catch (error) {
    console.error('Error populating sample cases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
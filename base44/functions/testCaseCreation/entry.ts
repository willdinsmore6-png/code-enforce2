import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    if (!user.municipality_id) {
      return Response.json({ error: 'User has no municipality_id', user }, { status: 400 });
    }

    // Try to create a test case
    const testCase = await base44.entities.Case.create({
      municipality_id: user.municipality_id,
      property_address: 'Test Address',
      violation_type: 'other',
      violation_description: 'Test description',
      complaint_date: new Date().toISOString().split('T')[0],
    });

    return Response.json({
      success: true,
      case: testCase,
      userMunicipalityId: user.municipality_id,
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      status: error.status,
    }, { status: error.status || 500 });
  }
});
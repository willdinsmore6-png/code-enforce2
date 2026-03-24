import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only superadmin can create municipalities, OR an 'admin' role user during self-onboarding (no municipality yet)
    const isSuperAdmin = user.role === 'superadmin';
    const isSelfOnboardingAdmin = user.role === 'admin' && !user.municipality_id;
    if (!isSuperAdmin && !isSelfOnboardingAdmin) {
      return Response.json({ error: 'Forbidden: only superadmins or admins during onboarding can create municipalities' }, { status: 403 });
    }

    const body = await req.json();
    const { name, short_name, municipality_type, state, address, contact_email, contact_phone, website, logo_url, tagline, admin_email, notes } = body;

    if (!name || !state) {
      return Response.json({ error: 'name and state are required' }, { status: 400 });
    }

    const municipality = await base44.asServiceRole.entities.Municipality.create({
      name,
      short_name: short_name || name,
      municipality_type: municipality_type || 'town',
      state,
      address: address || '',
      contact_email: contact_email || '',
      contact_phone: contact_phone || '',
      website: website || '',
      logo_url: logo_url || '',
      tagline: tagline || '',
      admin_email: admin_email || user.email,
      notes: notes || '',
      is_active: true,
      onboarding_complete: true,
    });

    return Response.json({ municipality });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
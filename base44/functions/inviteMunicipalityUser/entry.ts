import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, role, municipality_id } = await req.json();
    if (!email || !role || !municipality_id) {
      return Response.json({ error: 'email, role, and municipality_id required' }, { status: 400 });
    }

    // Only municipal admins and superadmins can invite users to their municipality
    const isSuperAdmin = user.role === 'superadmin';
    const isMuniAdmin = user.role === 'admin' && user.municipality_id === municipality_id;
    if (!isSuperAdmin && !isMuniAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get municipality details
    const munis = await base44.asServiceRole.entities.Municipality.filter({ id: municipality_id });
    if (!munis[0]) return Response.json({ error: 'Municipality not found' }, { status: 404 });
    const muni = munis[0];

    // Invite the user to the app
    await base44.users.inviteUser(email, role);

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `You're invited to ${muni.name} Code Enforcement Console`,
      body: `
        <div style="font-family: Inter, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px;">
          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0;">Welcome to Code Enforce</h2>
            <p style="color: #475569; margin: 0 0 12px 0;">You've been invited to the ${muni.name} municipal code enforcement console as a <strong>${role}</strong>.</p>
            <p style="color: #475569; margin: 0 0 20px 0;">Click the link below to accept your invitation and get started:</p>
            <div style="margin: 24px 0;">
              <a href="${window.location.origin}/login" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Accept Invitation</a>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 0;">If you have questions, contact your municipality administrator.</p>
          </div>
        </div>
      `,
    });

    return Response.json({ success: true, message: `User ${email} invited to ${muni.short_name || muni.name}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
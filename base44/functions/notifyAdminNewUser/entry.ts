import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const newUser = body?.data;
    if (!newUser) {
      return Response.json({ error: 'No user data provided' }, { status: 400 });
    }

    // Get all superadmins to notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const superAdmins = allUsers.filter(u => u.role === 'superadmin');

    if (superAdmins.length === 0) {
      return Response.json({ message: 'No superadmins to notify' });
    }

    const userName = newUser.full_name || 'Unknown';
    const userEmail = newUser.email || 'Unknown';
    const signupTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

    // Send email to each superadmin
    await Promise.all(superAdmins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `New User Access Request — ${userName}`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
            <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin: 0 0 8px 0;">New Access Request</h2>
              <p style="color: #64748b; margin: 0 0 24px 0;">A new user has signed up and is requesting access to Code Enforce.</p>
              
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${userName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
                <p style="margin: 0;"><strong>Requested at:</strong> ${signupTime} ET</p>
              </div>

              <p style="color: #475569; margin: 0 0 16px 0;">To grant access, go to your Super Admin dashboard and invite this user with the appropriate role and municipality assignment.</p>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Code Enforce — Municipal Enforcement Platform</p>
              </div>
            </div>
          </div>
        `,
      })
    ));

    return Response.json({ success: true, notified: superAdmins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
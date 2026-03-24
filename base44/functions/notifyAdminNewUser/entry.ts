import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsers = await base44.asServiceRole.entities.User.list();

    // Find users without a municipality assigned who signed up in the last 65 minutes
    const cutoff = new Date(Date.now() - 65 * 60 * 1000);
    const newPendingUsers = allUsers.filter(u =>
      !u.municipality_id &&
      u.role !== 'superadmin' &&
      u.created_date &&
      new Date(u.created_date) > cutoff
    );

    if (newPendingUsers.length === 0) {
      return Response.json({ message: 'No new pending users', checked: allUsers.length });
    }

    const superAdmins = allUsers.filter(u => u.role === 'superadmin');
    if (superAdmins.length === 0) {
      return Response.json({ message: 'No superadmins to notify' });
    }

    const userList = newPendingUsers.map(u =>
      `<tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;">${u.full_name || '(No name)'}</td>
        <td style="padding:10px 12px;">${u.email}</td>
        <td style="padding:10px 12px;">${new Date(u.created_date).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td>
      </tr>`
    ).join('');

    await Promise.all(superAdmins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `${newPendingUsers.length} New Access Request${newPendingUsers.length > 1 ? 's' : ''} — Code Enforce`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
            <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin: 0 0 8px 0;">New Access Request${newPendingUsers.length > 1 ? 's' : ''}</h2>
              <p style="color: #64748b; margin: 0 0 20px 0;">${newPendingUsers.length} user${newPendingUsers.length > 1 ? 's have' : ' has'} signed up and need${newPendingUsers.length === 1 ? 's' : ''} to be assigned to a municipality.</p>

              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:10px 12px; text-align:left; font-weight:600; color:#475569;">Name</th>
                    <th style="padding:10px 12px; text-align:left; font-weight:600; color:#475569;">Email</th>
                    <th style="padding:10px 12px; text-align:left; font-weight:600; color:#475569;">Signed Up</th>
                  </tr>
                </thead>
                <tbody>${userList}</tbody>
              </table>

              <p style="color: #475569; margin: 20px 0 0 0;">Go to the <strong>Super Admin Dashboard</strong> to assign them to a municipality and grant access.</p>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Code Enforce — Municipal Enforcement Platform</p>
              </div>
            </div>
          </div>
        `,
      })
    ));

    return Response.json({ success: true, notified: superAdmins.length, newUsers: newPendingUsers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the caller is an admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Look up the user by email to confirm they exist in the app
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'No user found with that email address' }, { status: 404 });
    }

    // Send a password reset email with a link to the login page
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: 'Bow Code Enforcement',
      subject: 'Password Reset - Bow Code Enforcement System',
      body: `
        <p>Hello,</p>
        <p>An administrator has requested a password reset for your account on the Bow NH Code Enforcement system.</p>
        <p>Please visit the login page and use the <strong>"Forgot Password"</strong> option to set a new password:</p>
        <p><a href="${Deno.env.get('APP_URL') || 'https://app.base44.app'}">Go to Login Page</a></p>
        <p>If you did not request this, please ignore this email or contact your administrator.</p>
        <br/>
        <p>Bow Code Enforcement Team</p>
      `
    });

    return Response.json({ success: true, message: `Password reset email sent to ${email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

async function findUserRow(
  base44: ReturnType<typeof createClientFromRequest>,
  emailNorm: string
): Promise<Record<string, unknown> | null> {
  try {
    const exact = await base44.asServiceRole.entities.User.filter({ email: emailNorm });
    if (exact?.[0]) return exact[0] as Record<string, unknown>;
  } catch {
    /* continue */
  }
  try {
    const all = await base44.asServiceRole.entities.User.list('-created_date', 8000);
    const hit = (all || []).find((u) => normEmail(String((u as { email?: string }).email || '')) === emailNorm);
    return (hit as Record<string, unknown>) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
    }

    const body = await req.json();
    const { email, town_id } = body as { email?: string; town_id?: string };
    if (!email?.trim()) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }
    if (!town_id?.trim()) {
      return Response.json({ error: 'town_id is required' }, { status: 400 });
    }

    const emailNorm = normEmail(email);
    const tid = String(town_id).trim();

    let row = await findUserRow(base44, emailNorm);

    const applyTown = async (u: Record<string, unknown>) => {
      const id = String(u.id);
      const prevData = (u.data && typeof u.data === 'object' ? u.data : {}) as Record<string, unknown>;
      await base44.asServiceRole.entities.User.update(id, {
        town_id: tid,
        data: { ...prevData, town_id: tid },
      });
    };

    if (row) {
      await applyTown(row);
      return Response.json({
        success: true,
        action: 'updated_existing_row',
        userId: row.id,
        message: `Linked ${emailNorm} to town ${tid}.`,
      });
    }

    // No User row: auth may still exist. Try invite (creates row when platform allows).
    try {
      await base44.users.inviteUser(email.trim(), 'user');
    } catch (invErr: unknown) {
      const msg = invErr instanceof Error ? invErr.message : String(invErr);
      return Response.json({
        success: false,
        error: 'invite_failed',
        detail: msg,
        hint:
          'This email is probably still registered in Base44. In the Base44 dashboard: open this app → Users → search for this email → remove the user from the app (or restore the profile). Then run this tool again or send a normal staff invite.',
      }, { status: 409 });
    }

    await new Promise((r) => setTimeout(r, 1200));
    row = await findUserRow(base44, emailNorm);
    if (row) {
      await applyTown(row);
      return Response.json({
        success: true,
        action: 'invited_and_linked',
        userId: row.id,
        message: `Invitation sent and ${emailNorm} linked to town ${tid}.`,
      });
    }

    return Response.json({
      success: true,
      action: 'invited_pending',
      message:
        'Invite was sent but the User row was not visible yet. Ask the user to accept the email, then confirm they appear under Admin → Users. If not, use Base44 dashboard Users for this app.',
    });
  } catch (error) {
    console.error('relinkUserByEmail:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

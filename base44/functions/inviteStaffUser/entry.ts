import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, town_id, acting_town_id: actingTownId } = body;
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const emailNorm = normEmail(email);

    let assignedTown = town_id || user.town_id || user.data?.town_id;
    if (user.role === 'superadmin' && actingTownId && !assignedTown) {
      assignedTown = actingTownId;
    }
    if (user.role === 'superadmin' && actingTownId && assignedTown !== actingTownId) {
      return Response.json(
        { error: 'Forbidden: invites while impersonating must target the active municipality only' },
        { status: 403 }
      );
    }

    if (!assignedTown || String(assignedTown).trim() === '') {
      return Response.json(
        { error: 'town_id is required (select a municipality or use town impersonation).' },
        { status: 400 }
      );
    }

    if (user.role === 'admin' && role === 'superadmin') {
      return Response.json({ error: 'Admins cannot invite Superadmins' }, { status: 403 });
    }

    const inviteRole = user.role === 'superadmin' && role === 'admin' ? 'admin' : 'user';

    await base44.users.inviteUser(email.trim(), inviteRole);

    // Best-effort: never fail the invite response if AuditLog shape differs or RLS blocks it.
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        case_id: '',
        zoning_determination_id: '',
        town_id: String(assignedTown),
        case_number: '',
        entity_type: 'StaffInvite',
        entity_id: emailNorm,
        user_email: user.email,
        user_name: (user.full_name as string) || user.email,
        action: 'staff_invite_pending',
        changes: JSON.stringify({
          invitee_email: emailNorm,
          invited_by: user.email,
          invite_role: inviteRole,
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('inviteStaffUser: pending audit log skipped', e);
    }

    // Short merge window only — long loops can hit serverless timeouts and break the admin UI.
    const mergeUserTown = async (row: Record<string, unknown>) => {
      const prevData = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>;
      await base44.asServiceRole.entities.User.update(String(row.id), {
        town_id: assignedTown,
        data: { ...prevData, town_id: assignedTown },
      });
    };

    for (let i = 0; i < 5; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 400));
      const allUsers = await base44.asServiceRole.entities.User.list();
      const newUser = (allUsers || []).find((u) => normEmail(String(u.email || '')) === emailNorm);
      if (newUser) {
        try {
          await mergeUserTown(newUser as Record<string, unknown>);
        } catch (e) {
          console.error('inviteStaffUser: merge town failed', e);
        }
        break;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

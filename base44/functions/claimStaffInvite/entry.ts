import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Links a logged-in user to town_id from a pending staff invite (AuditLog).
 * Invites often complete signup after inviteStaffUser runs, so the User row
 * may not exist when the server first tries to set town_id.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (me.role === 'superadmin') {
      return Response.json({ claimed: false, reason: 'superadmin' });
    }

    const existingTown = me.town_id && me.town_id !== 'Null' ? String(me.town_id) : '';
    if (existingTown) {
      return Response.json({ claimed: false, reason: 'already_linked', town_id: existingTown });
    }

    const emailLower = me.email.trim().toLowerCase();

    let rows: Array<Record<string, unknown>> = [];
    try {
      rows = (await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1000)) || [];
    } catch {
      rows = [];
    }

    const pending = rows.filter((log) => log.action === 'staff_invite_pending');

    const matches: Array<{ log: Record<string, unknown>; ts: number }> = [];
    for (const log of pending) {
      try {
        const changes = typeof log.changes === 'string' ? log.changes : '';
        const c = JSON.parse(changes || '{}') as { invitee_email?: string };
        if (c.invitee_email?.trim().toLowerCase() === emailLower) {
          const ts = new Date(String(log.timestamp || 0)).getTime();
          matches.push({ log, ts: Number.isFinite(ts) ? ts : 0 });
        }
      } catch {
        /* skip malformed */
      }
    }

    matches.sort((a, b) => b.ts - a.ts);
    const best = matches[0];
    if (!best) {
      return Response.json({ claimed: false, reason: 'no_pending_invite' });
    }

    const log = best.log;
    const townId = String(log.town_id || '').trim();
    if (!townId) {
      return Response.json({ claimed: false, reason: 'invite_missing_town' });
    }

    const prevData = (me.data && typeof me.data === 'object' ? me.data : {}) as Record<string, unknown>;
    await base44.asServiceRole.entities.User.update(me.id, {
      town_id: townId,
      data: { ...prevData, town_id: townId },
    });

    try {
      await base44.asServiceRole.entities.AuditLog.update(String(log.id), {
        action: 'staff_invite_claimed',
      });
    } catch (e) {
      console.warn('claimStaffInvite: could not mark invite log', e);
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        case_id: '',
        zoning_determination_id: '',
        town_id: townId,
        case_number: '',
        entity_type: 'User',
        entity_id: me.id,
        user_email: me.email,
        user_name: (me.full_name as string) || me.email,
        action: 'staff_invite_accepted',
        changes: JSON.stringify({ invitee_email: emailLower, linked_town_id: townId }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('claimStaffInvite: follow-up audit log', e);
    }

    return Response.json({ claimed: true, town_id: townId });
  } catch (error) {
    console.error('claimStaffInvite:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

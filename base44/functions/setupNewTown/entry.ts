import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { town_name, state, agreement_accepted_at, agreement_accepted_by } = await req.json();
    if (!town_name) return Response.json({ error: 'town_name is required' }, { status: 400 });

    // Create the new TownConfig using service role (users can't create towns directly)
    const town = await base44.asServiceRole.entities.TownConfig.create({
      town_name,
      state: state || 'NH',
      is_active: false, // Will be activated on successful Stripe payment
      ...(agreement_accepted_at ? { agreement_accepted_at, agreement_accepted_by: agreement_accepted_by || user.email } : {}),
    });

    // Link the user to the new town via their data field
    await base44.asServiceRole.entities.User.update(user.id, {
      data: { ...(user.data || {}), town_id: town.id },
    });

    console.log(`New town created: ${town.id} (${town_name}) — linked to user ${user.email}`);
    return Response.json({ success: true, town_id: town.id, town });
  } catch (error) {
    console.error('setupNewTown error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
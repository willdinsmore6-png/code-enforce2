import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole; // Use admin power for all updates
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const getTownId = (obj) => obj?.metadata?.town_id || obj?.subscription_details?.metadata?.town_id;

    // 1. IMMEDIATE ACTIVATION (Fixes the "Hang-up")
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const townId = getTownId(session);
      const userEmail = session.customer_details?.email;

      if (townId) {
        // Activate Town immediately
        await admin.entities.TownConfig.update(townId, { 
          is_active: true,
          stripe_customer_id: session.customer 
        });

        // BRIDGE: Link the user who paid to the town
        if (userEmail) {
          const users = await admin.entities.User.list({ filter: { email: userEmail } });
          if (users.length > 0) {
            await admin.entities.User.update(users[0].id, { 
              town_id: townId,
              role: 'admin' 
            });
          }
        }
        console.log(`Immediate activation for town: ${townId}`);
      }
    }

    // 2. RECURRING BILLING (Existing Logic)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      let townId = getTownId(invoice);
      
      if (!townId && invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        townId = getTownId(sub);
      }
      
      if (townId) {
        await admin.entities.TownConfig.update(townId, { 
          is_active: true,
          stripe_subscription_id: invoice.subscription 
        });
        console.log(`Verified active: ${townId}`);
      }
    }

    // 3. CANCELLATIONS / FAILURES
    if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.deleted') {
      const obj = event.data.object;
      const townId = getTownId(obj);
      if (townId) {
        await admin.entities.TownConfig.update(townId, { is_active: false });
        console.log(`Deactivated: ${townId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

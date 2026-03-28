import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    const getTownId = (obj) => obj?.metadata?.town_id;

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      // Get town_id from subscription metadata
      let townId = getTownId(invoice);
      if (!townId && invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        townId = getTownId(sub);
        // Store subscription id on town
        if (townId) {
          await base44.asServiceRole.entities.TownConfig.update(townId, {
            stripe_subscription_id: invoice.subscription,
            is_active: true,
          });
        }
      } else if (townId) {
        await base44.asServiceRole.entities.TownConfig.update(townId, { is_active: true });
      }
      console.log(`Activated town: ${townId}`);
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      let townId = getTownId(invoice);
      if (!townId && invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        townId = getTownId(sub);
      }
      if (townId) {
        await base44.asServiceRole.entities.TownConfig.update(townId, { is_active: false });
        console.log(`Deactivated town (payment failed): ${townId}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const townId = getTownId(sub);
      if (townId) {
        await base44.asServiceRole.entities.TownConfig.update(townId, { is_active: false });
        console.log(`Deactivated town (subscription canceled): ${townId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
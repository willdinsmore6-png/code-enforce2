import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    const getTownId = (obj) => obj?.metadata?.town_id || obj?.subscription_details?.metadata?.town_id;

    // 1. SUCCESS: Activate Town
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const townId = getTownId(event.data.object);
      if (townId) {
        await admin.entities.TownConfig.update(townId, { is_active: true });
        console.log(`Town ${townId} verified ACTIVE.`);
      }
    }

    // 2. FAILURE: Deactivate Town (Billing Security)
    if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.deleted') {
      const townId = getTownId(event.data.object);
      if (townId) {
        await admin.entities.TownConfig.update(townId, { is_active: false });
        console.log(`Town ${townId} DEACTIVATED due to billing issue.`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});

  } catch (error) {
    console.error('Webhook Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

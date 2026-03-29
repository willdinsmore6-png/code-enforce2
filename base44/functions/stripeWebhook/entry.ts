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

    // HANDLE SUCCESSFUL PAYMENT
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const townId = getTownId(session);
      const email = session.customer_details?.email;

      if (townId) {
        // Activate Town
        await admin.entities.TownConfig.update(townId, { is_active: true });

        // Link User to Town automatically
        if (email) {
          const users = await admin.entities.User.list({ filter: { email } });
          if (users.length > 0) {
            await admin.entities.User.update(users[0].id, { town_id: townId, role: 'admin' });
          }
        }
      }
    }

    // HANDLE CANCELLATION
    if (event.type === 'customer.subscription.deleted') {
      const townId = getTownId(event.data.object);
      if (townId) await admin.entities.TownConfig.update(townId, { is_active: false });
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

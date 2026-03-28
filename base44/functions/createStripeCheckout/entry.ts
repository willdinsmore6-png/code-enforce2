import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const priceId = Deno.env.get('STRIPE_PRICE_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { town_id, user_email } = body;
    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    // 1. Get Town (Bypassing RLS with admin client)
    const town = await admin.entities.TownConfig.get(town_id).catch(() => null);
    let customerId = town?.stripe_customer_id;

    if (!customerId) {
      // 2. Create Stripe Customer
      const customer = await stripe.customers.create({
        email: user_email || "billing@code-enforce.com",
        name: town?.town_name || `Town ${town_id}`,
      });
      customerId = customer.id;

      // 3. TRY to update, but DO NOT stop if it fails with a 403
      try {
        await admin.entities.TownConfig.update(town_id, {
          stripe_customer_id: customerId,
        });
      } catch (e) {
        console.warn("DB Update blocked, but proceeding to Stripe anyway.");
      }
    }

    // 4. Generate the Session
    const origin = "https://code-enforce.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('SERVER ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

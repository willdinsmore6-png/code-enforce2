import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const priceId = Deno.env.get('STRIPE_PRICE_ID');

Deno.serve(async (req) => {
  try {
    // This helper automatically uses the project's internal system token
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { town_id, user_email } = body;

    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    // IMPORTANT: We use 'admin' here to bypass the "must be logged in" check
    const town = await admin.entities.TownConfig.get(town_id);
    if (!town) return Response.json({ error: 'Town not found' }, { status: 404 });

    let customerId = town.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email || "billing@town.com",
        name: town.town_name,
        metadata: { town_id: String(town_id) },
      });
      customerId = customer.id;

      await admin.entities.TownConfig.update(town_id, {
        stripe_customer_id: customerId,
      });
    }

    const origin = "https://code-enforce.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id: String(town_id) },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClient } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

// Pulling values from your Secrets tab
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID');
const B44_KEY = Deno.env.get('BASE44_API_KEY');

const stripe = new Stripe(STRIPE_KEY);

Deno.serve(async (req) => {
  try {
    // Force admin permissions using the API key instead of the user request
    const base44 = createClient({ token: B44_KEY });

    const body = await req.json().catch(() => ({}));
    const { town_id, user_email } = body;

    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    // Fetch the town config
    const town = await base44.entities.TownConfig.get(town_id);
    if (!town) return Response.json({ error: 'Town not found' }, { status: 404 });

    let customerId = town.stripe_customer_id;

    // Find or create Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email || "billing@town.com",
        name: town.town_name,
        metadata: { town_id: String(town_id) },
      });
      customerId = customer.id;

      // This update will now succeed because we are using the API key
      await base44.entities.TownConfig.update(town_id, {
        stripe_customer_id: customerId,
      });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id: String(town_id) },
      subscription_data: { metadata: { town_id: String(town_id) } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

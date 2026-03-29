import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const priceId = Deno.env.get('STRIPE_PRICE_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { town_id } = await req.json().catch(() => ({}));
    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    const town = await base44.asServiceRole.entities.TownConfig.get(town_id);
    
    // 1. DEDUPLICATION: Check if customer already exists in Stripe
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = existing.data.length > 0 ? existing.data[0].id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: town?.town_name || "Municipal User",
        metadata: { town_id: String(town_id) },
      });
      customerId = customer.id;
    }

    // 2. CREATE SESSION: With Metadata bridge
    const origin = "https://code-enforce.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id: String(town_id) },
      subscription_data: { metadata: { town_id: String(town_id) } }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

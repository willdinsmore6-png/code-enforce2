import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { town_id, user_email } = await req.json();
    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const priceId = Deno.env.get('STRIPE_PRICE_ID');

    // Get the town config to check for existing customer
    const town = await base44.entities.TownConfig.get(town_id);
    if (!town) return Response.json({ error: 'Town not found' }, { status: 404 });

    // Find or create Stripe customer
    let customerId = town.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email || user.email,
        name: town.town_name,
        metadata: { town_id },
      });
      customerId = customer.id;
      await base44.asServiceRole.entities.TownConfig.update(town_id, {
        stripe_customer_id: customerId,
      });
    }

    // Determine app base URL
    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id },
      subscription_data: { metadata: { town_id } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
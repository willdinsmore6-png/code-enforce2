import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

function appOrigin(req: Request, body: { app_origin?: string }): string {
  const env = Deno.env.get('PUBLIC_APP_URL')?.replace(/\/$/, '');
  if (env) return env;
  if (body.app_origin && /^https?:\/\//i.test(body.app_origin)) {
    try {
      return new URL(body.app_origin).origin;
    } catch { /* ignore */ }
  }
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch { /* ignore */ }
  }
  return 'https://www.code-enforce.com';
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!secret || !priceId) {
      return Response.json({ error: 'Stripe is not configured (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)' }, { status: 500 });
    }

    const stripe = new Stripe(secret);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { town_id } = body;
    if (!town_id) return Response.json({ error: 'town_id is required' }, { status: 400 });

    const origin = appOrigin(req, body);

    const town = await base44.asServiceRole.entities.TownConfig.get(town_id);

    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = existing.data.length > 0 ? existing.data[0].id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: town?.town_name || 'Municipal User',
        metadata: { town_id: String(town_id) },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe replaces {CHECKOUT_SESSION_ID}; keeps users on the correct app origin and aids support lookup.
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id: String(town_id) },
      subscription_data: { metadata: { town_id: String(town_id) } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return Response.json({ error: message }, { status: 500 });
  }
});

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

    // 1. Get Town (Bypassing error if possible)
    const town = await admin.entities.TownConfig.get(town_id).catch(() => ({}));
    
    // 2. Use existing ID or create new Stripe Customer
    let customerId = town?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email || "billing@town.com",
        name: town?.town_name || `Town ${town_id}`,
        metadata: { town_id: String(town_id) },
      });
      customerId = customer.id;

      // 3. TRY to update, but DON'T stop if it fails
      try {
        await admin.entities.TownConfig.update(town_id, {
          stripe_customer_id: customerId,
        });
        console.log("Database updated successfully.");
      } catch (dbError) {
        console.error("Database update blocked by permissions, but proceeding to Stripe anyway.");
      }
    }

    // 4. Generate the Stripe Session
    const origin = "https://code-enforce.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: { town_id: String(town_id) },
    });

    // 5. Return the URL so the button works!
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Stripe error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

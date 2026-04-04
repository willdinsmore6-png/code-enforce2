import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

/** Pull town_id from Stripe objects; invoices often only carry subscription id. */
async function resolveTownId(stripe: Stripe, obj: Record<string, unknown>, eventType: string): Promise<string | null> {
  const direct = obj?.metadata as Record<string, string> | undefined;
  if (direct?.town_id) return String(direct.town_id);

  const subDetails = (obj as { subscription_details?: { metadata?: { town_id?: string } } })?.subscription_details;
  if (subDetails?.metadata?.town_id) return String(subDetails.metadata.town_id);

  let subscriptionId: string | null = null;

  if (eventType === 'checkout.session.completed') {
    const sub = (obj as { subscription?: string | { id?: string } }).subscription;
    if (typeof sub === 'string') subscriptionId = sub;
    else if (sub && typeof sub === 'object' && sub.id) subscriptionId = sub.id;
  }

  if (eventType.startsWith('invoice.')) {
    const inv = obj as { subscription?: string | { id?: string } | null };
    const s = inv.subscription;
    if (typeof s === 'string') subscriptionId = s;
    else if (s && typeof s === 'object' && s.id) subscriptionId = s.id;
  }

  if (eventType.startsWith('customer.subscription')) {
    const s = obj as { id?: string; metadata?: { town_id?: string } };
    if (s.metadata?.town_id) return String(s.metadata.town_id);
  }

  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.metadata?.town_id) return String(sub.metadata.town_id);
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret || !whSecret) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(secret);
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
    const obj = event.data.object as Record<string, unknown>;

    // Subscription lifecycle → TownConfig.is_active (source of truth for app paywall)
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const townId = sub.metadata?.town_id;
      if (townId) {
        const paidLike = sub.status === 'active' || sub.status === 'trialing';
        await admin.entities.TownConfig.update(String(townId), { is_active: paidLike });
        console.log(`Town ${townId} subscription.updated → is_active=${paidLike} (${sub.status})`);
      }
      return Response.json({ received: true });
    }

    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const townId = await resolveTownId(stripe, obj, event.type);
      if (townId) {
        await admin.entities.TownConfig.update(townId, { is_active: true });
        console.log(`Town ${townId} activated (${event.type}).`);
      } else {
        console.warn(`No town_id resolved for ${event.type}`);
      }
      return Response.json({ received: true });
    }

    if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.deleted') {
      const townId = await resolveTownId(stripe, obj, event.type);
      if (townId) {
        await admin.entities.TownConfig.update(townId, { is_active: false });
        console.log(`Town ${townId} deactivated (${event.type}).`);
      }
      return Response.json({ received: true });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook failed';
    return Response.json({ error: message }, { status: 400 });
  }
});

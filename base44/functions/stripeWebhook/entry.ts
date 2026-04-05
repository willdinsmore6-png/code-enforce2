import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

type AdminClient = ReturnType<typeof createClientFromRequest>['asServiceRole'];

function appLoginUrl(): string {
  const u = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('APP_URL');
  if (u) return u.replace(/\/$/, '');
  return 'https://codeenforce.base44.app';
}

function emailFromName(): string {
  return Deno.env.get('SUBSCRIPTION_EMAIL_FROM_NAME') || 'CodeEnforce Pro';
}

/** Best-effort: never throw; webhook must still 200 after DB updates. */
async function sendSubscriptionEmail(
  admin: AdminClient,
  opts: { to: string; subject: string; html: string }
): Promise<void> {
  try {
    await admin.integrations.Core.SendEmail({
      to: opts.to,
      from_name: emailFromName(),
      subject: opts.subject,
      body: opts.html,
    });
    console.log(`Subscription email sent: ${opts.subject} → ${opts.to}`);
  } catch (e) {
    console.error('Subscription email failed (non-fatal):', e);
  }
}

async function resolveRecipientEmail(
  stripe: Stripe,
  eventType: string,
  obj: Record<string, unknown>
): Promise<string | null> {
  if (eventType === 'checkout.session.completed') {
    const s = obj as Stripe.Checkout.Session;
    const fromDetails = s.customer_details?.email;
    if (fromDetails) return fromDetails;
    if (s.customer_email) return s.customer_email;
    const cid = typeof s.customer === 'string' ? s.customer : s.customer && typeof s.customer === 'object' && 'id' in s.customer
      ? (s.customer as { id: string }).id
      : null;
    if (cid) {
      const c = await stripe.customers.retrieve(cid);
      if (!c.deleted && 'email' in c && c.email) return c.email;
    }
    return null;
  }

  if (eventType === 'customer.subscription.deleted') {
    const sub = obj as Stripe.Subscription;
    const cid = typeof sub.customer === 'string'
      ? sub.customer
      : sub.customer && typeof sub.customer === 'object' && 'id' in sub.customer
        ? (sub.customer as { id: string }).id
        : null;
    if (cid) {
      const c = await stripe.customers.retrieve(cid);
      if (!c.deleted && 'email' in c && c.email) return c.email;
    }
  }

  return null;
}

function startedEmailHtml(townName: string, loginUrl: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;line-height:1.5;color:#1e293b;">
      <p>Hello,</p>
      <p>Thank you — your <strong>CodeEnforce Pro</strong> subscription is now active for <strong>${escapeHtml(townName)}</strong>.</p>
      <p>You can sign in and use the full dashboard right away:</p>
      <p><a href="${loginUrl}" style="color:#2563eb;">Open CodeEnforce Pro</a></p>
      <p style="font-size:14px;color:#64748b;">If you have questions, reply to this email or contact support.</p>
    </div>
  `;
}

function cancelledEmailHtml(townName: string, loginUrl: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;line-height:1.5;color:#1e293b;">
      <p>Hello,</p>
      <p>Your <strong>CodeEnforce Pro</strong> subscription for <strong>${escapeHtml(townName)}</strong> has ended or been cancelled.</p>
      <p>Access for your municipality may be limited until billing is restored. If you cancelled on purpose, no further action is needed.</p>
      <p>To re-subscribe or get help, visit:</p>
      <p><a href="${loginUrl}" style="color:#2563eb;">${loginUrl}</a></p>
      <p style="font-size:14px;color:#64748b;">Questions? Contact your CodeEnforce administrator or support.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    const loginUrl = appLoginUrl();

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
        // Only on Checkout completion — avoids duplicate "welcome" when invoice.paid also fires.
        if (event.type === 'checkout.session.completed') {
          const to = await resolveRecipientEmail(stripe, event.type, obj);
          let townName = 'your municipality';
          try {
            const town = await admin.entities.TownConfig.get(townId);
            if (town?.town_name) townName = String(town.town_name);
          } catch { /* optional */ }
          if (to) {
            await sendSubscriptionEmail(admin, {
              to,
              subject: `CodeEnforce Pro — subscription active for ${townName}`,
              html: startedEmailHtml(townName, loginUrl),
            });
          } else {
            console.warn(`checkout.session.completed: no customer email for town ${townId}`);
          }
        }
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
        if (event.type === 'customer.subscription.deleted') {
          const to = await resolveRecipientEmail(stripe, event.type, obj);
          let townName = 'your municipality';
          try {
            const town = await admin.entities.TownConfig.get(townId);
            if (town?.town_name) townName = String(town.town_name);
          } catch { /* optional */ }
          if (to) {
            await sendSubscriptionEmail(admin, {
              to,
              subject: `CodeEnforce Pro — subscription ended for ${townName}`,
              html: cancelledEmailHtml(townName, loginUrl),
            });
          } else {
            console.warn(`customer.subscription.deleted: no customer email for town ${townId}`);
          }
        }
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

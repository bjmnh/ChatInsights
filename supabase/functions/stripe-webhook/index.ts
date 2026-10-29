import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { grantPremiumFromSession, revokePremiumForPaymentIntent } from '../_shared/premium.ts';
import { requireEnv, verifyStripeSignature } from '../_shared/stripe.ts';

// Stripe calls this directly. Deploy with verify_jwt = false (see supabase/config.toml).
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.text();
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    const valid = await verifyStripeSignature(
      payload,
      req.headers.get('stripe-signature'),
      requireEnv('STRIPE_WEBHOOK_SECRET'),
    );
    if (!valid) {
      return json({ error: 'Invalid Stripe signature' }, 400);
    }
    event = JSON.parse(payload);
  } catch (error) {
    console.error('stripe-webhook signature:', error);
    return json({ error: error instanceof Error ? error.message : 'Invalid webhook' }, 400);
  }

  try {
    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const object = event.data?.object || {};

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await grantPremiumFromSession(supabase, object);
    } else if (event.type === 'charge.refunded') {
      const paymentIntent = object.payment_intent;
      if (typeof paymentIntent === 'string') {
        await revokePremiumForPaymentIntent(supabase, paymentIntent);
      }
    }

    return json({ received: true });
  } catch (error) {
    console.error('stripe-webhook:', error);
    return json({ error: error instanceof Error ? error.message : 'Webhook failed' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { requireEnv, stripeRequest } from '../_shared/stripe.ts';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'Authorization required');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) throw new HttpError(401, 'Invalid token');

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, premium_status, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      const missingColumn = /premium_status|stripe_customer_id/i.test(profileError.message || '');
      throw new HttpError(
        503,
        missingColumn
          ? 'Apply the premium_unlock migration before taking payments.'
          : 'Could not load the billing profile.',
      );
    }

    if (profile?.premium_status) {
      return json({ alreadyPremium: true });
    }

    const secretKey = requireEnv('STRIPE_SECRET_KEY');
    const priceId = requireEnv('STRIPE_PRICE_ID');
    const appUrl = resolveAppUrl(req);

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripeRequest(secretKey, 'POST', 'customers', {
        email: user.email || profile?.email || '',
        'metadata[supabase_user_id]': user.id,
      });
      customerId = String(customer.id);
      if (profile) {
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
      } else {
        await supabase.from('users').insert({
          id: user.id,
          email: user.email || `user-${user.id}@placeholder.chatinsights.local`,
          stripe_customer_id: customerId,
          premium_status: false,
        });
      }
    }

    const session = await stripeRequest(secretKey, 'POST', 'checkout/sessions', {
      mode: 'payment',
      customer: customerId,
      client_reference_id: user.id,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'metadata[user_id]': user.id,
      'metadata[price_id]': priceId,
      allow_promotion_codes: 'true',
      success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?checkout=cancel`,
    });

    if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout URL');
    return json({ url: session.url, alreadyPremium: false });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error('create-checkout-session:', error);
    return json({ error: error instanceof Error ? error.message : 'Checkout failed' }, status);
  }
});

function resolveAppUrl(req: Request): string {
  const configured = (Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || '').replace(/\/$/, '');
  const allowlist = (Deno.env.get('ALLOWED_ORIGINS') || configured)
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const origin = (req.headers.get('origin') || '').replace(/\/$/, '');
  if (origin && allowlist.includes(origin)) return origin;
  if (!configured) throw new HttpError(500, 'APP_URL is not set');
  return configured;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

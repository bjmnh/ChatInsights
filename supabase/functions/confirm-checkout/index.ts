import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { grantPremiumFromSession } from '../_shared/premium.ts';
import { requireEnv, stripeRequest } from '../_shared/stripe.ts';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Backup path for the webhook. The browser returns with a session id; this function
// asks Stripe whether that session is paid and belongs to the signed-in user.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

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

    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      throw new HttpError(400, 'A Stripe checkout session id is required');
    }

    const session = await stripeRequest(
      requireEnv('STRIPE_SECRET_KEY'),
      'GET',
      `checkout/sessions/${encodeURIComponent(sessionId)}`,
    );
    const owner = (session.metadata as { user_id?: string } | undefined)?.user_id
      || session.client_reference_id;
    if (owner !== user.id) throw new HttpError(403, 'This checkout does not belong to you');

    const result = await grantPremiumFromSession(supabase, session);
    return json({ premium: result.granted, paymentStatus: session.payment_status });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error('confirm-checkout:', error);
    return json({ error: error instanceof Error ? error.message : 'Could not confirm checkout' }, status);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

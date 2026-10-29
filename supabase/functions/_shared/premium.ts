// Records a paid Checkout session and flips the account to premium.
// Callers must use the service role. The users trigger rejects the same write from a browser JWT.

type QueryResult = {
  error: { message: string } | null;
  data?: { id?: string; user_id?: string } | null;
  count?: number | null;
};

type Query = Promise<QueryResult> & {
  eq: (column: string, value: unknown) => Query;
  maybeSingle: () => Promise<QueryResult>;
};

type Db = {
  from: (table: string) => {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<QueryResult>;
    insert: (values: Record<string, unknown>) => Promise<QueryResult>;
    update: (values: Record<string, unknown>) => Query;
    select: (columns: string, options?: { count?: string; head?: boolean }) => Query;
  };
};

type CheckoutSession = {
  id?: string;
  mode?: string;
  payment_status?: string;
  client_reference_id?: string;
  amount_total?: number | null;
  currency?: string;
  customer_email?: string;
  metadata?: { user_id?: string; price_id?: string };
  customer_details?: { email?: string };
  customer?: string | { id?: string };
  payment_intent?: string | { id?: string };
};

export async function grantPremiumFromSession(supabase: Db, session: CheckoutSession) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!userId) throw new Error('Checkout session is missing a user id');
  if (session.mode && session.mode !== 'payment') {
    throw new Error('Only one-time payments unlock premium');
  }
  if (session.payment_status !== 'paid') {
    return { granted: false, userId, paymentStatus: session.payment_status as string };
  }

  const email = session.customer_details?.email || session.customer_email || null;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  const { error: payError } = await supabase.from('payments').upsert({
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_customer_id: customerId,
    price_id: session.metadata?.price_id || null,
    amount: session.amount_total ?? null,
    currency: session.currency || 'usd',
    status: 'paid',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_checkout_session_id' });
  if (payError) throw new Error(`Could not record payment: ${payError.message}`);

  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const unlock = {
    premium_status: true,
    premium_unlocked_at: new Date().toISOString(),
    ...(customerId ? { stripe_customer_id: customerId } : {}),
  };

  if (!existing) {
    const { error } = await supabase.from('users').insert({
      id: userId,
      email: email || `user-${userId}@placeholder.chatinsights.local`,
      ...unlock,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('users').update(unlock).eq('id', userId);
    if (error) throw new Error(error.message);
  }

  return { granted: true, userId };
}

export async function revokePremiumForPaymentIntent(supabase: Db, paymentIntentId: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('user_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return { revoked: false };

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', paymentIntentId);
  if (updateError) throw new Error(updateError.message);

  const { count, error: countError } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', payment.user_id)
    .eq('status', 'paid');
  if (countError) throw new Error(countError.message);

  if (!count) {
    const { error: revokeError } = await supabase
      .from('users')
      .update({ premium_status: false, premium_unlocked_at: null })
      .eq('id', payment.user_id);
    if (revokeError) throw new Error(revokeError.message);
    return { revoked: true, userId: payment.user_id };
  }

  return { revoked: false, userId: payment.user_id };
}

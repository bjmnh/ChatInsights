import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'ChatInsights',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during webhook verification';
      console.error(`Webhook signature verification failed: ${errorMessage}`);
      return new Response(`Webhook signature verification failed: ${errorMessage}`, { status: 400 });
    }

    // Process the event asynchronously
    handleEvent(event).catch(console.error);

    return Response.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
    return;
  }

  // Handle one-time payment completion
  console.log('Received event type:', event.type);
  
  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    const { mode, payment_status, id: sessionId } = session;
    
    console.log('Processing checkout.session.completed event for session:', sessionId);
    console.log('Session object:', JSON.stringify(session, null, 2));
    
    // Log the raw event data for debugging
    console.log('Raw event data:', JSON.stringify(event, null, 2));

    console.log('Processing checkout.session.completed event');
    console.log('Mode:', mode, 'Payment status:', payment_status);
    
    if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = session;
        
        // Use checkout session ID as the payment reference
        // Since payment_intent is null, we'll use the checkout session ID
        // and prefix it to indicate it's not a real payment intent ID
        const payment_intent_id = `checkout_${session.id}`;
        
        console.log(`Using checkout session ID as payment reference: ${payment_intent_id}`);
        
        // Log the original session for debugging
        console.log('Original checkout session:', {
          id: session.id,
          payment_intent: session.payment_intent,
          payment_status: session.payment_status,
          status: session.status,
          customer: session.customer,
          amount_total: session.amount_total,
          currency: session.currency
        });

        // First, insert the order into the stripe_orders table
        console.log('Inserting order into database...');
        const { error: orderError } = await supabase
          .from('stripe_orders')
          .insert({
            checkout_session_id,
            payment_intent_id,
            customer_id: customerId,
            amount_subtotal: amount_subtotal || 0,
            amount_total: amount_total || 0,
            currency: currency || 'usd',
            payment_status,
            status: 'completed'
          });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        
        console.log('Successfully inserted order for customer:', customerId);
        
        console.log('Looking up customer in stripe_customers table...');
        
        // Get user ID from stripe_customers
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single();
          
        console.log('Customer lookup result:', { customerData, customerError });
          
        if (customerError || !customerData) {
          console.error('Error finding customer:', customerError);
          return;
        }
        
        // Update user's premium status
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            premium_status: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerData.user_id);
          
        if (updateError) {
          console.error('Error updating user premium status:', updateError);
          return;
        }
        
        console.log(`Updated premium status for user ${customerData.user_id}`);
        
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id} and updated premium status`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}
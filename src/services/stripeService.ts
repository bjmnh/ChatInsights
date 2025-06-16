import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { Product } from '../stripe-config';

export interface CheckoutSessionRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  mode: 'payment' | 'subscription';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface OrderData {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export class StripeService {
  private static getApiUrl(endpoint: string): string {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;
  }

  private static async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  static async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const defaultSuccessUrl = `${config.app.url}/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${config.app.url}/pricing`;

      const response = await fetch(this.getApiUrl('stripe-checkout'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          price_id: request.priceId,
          success_url: request.successUrl || defaultSuccessUrl,
          cancel_url: request.cancelUrl || defaultCancelUrl,
          mode: request.mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  static async getUserSubscription(): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  static async getUserOrders(): Promise<OrderData[]> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching user orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }

  static async purchaseProduct(product: Product): Promise<void> {
    try {
      // For test products with $0 price, simulate a successful purchase
      if (product.isTest && product.price === 0) {
        // Create a mock successful order in the database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Create a test customer record if it doesn't exist
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        let customerId = customer?.customer_id;
        
        if (!customerId) {
          customerId = `test_customer_${user.id}`;
          await supabase.from('stripe_customers').insert({
            user_id: user.id,
            customer_id: customerId,
          });
        }

        // Create a test order
        await supabase.from('stripe_orders').insert({
          checkout_session_id: `test_session_${Date.now()}`,
          payment_intent_id: `test_pi_${Date.now()}`,
          customer_id: customerId,
          amount_subtotal: 0,
          amount_total: 0,
          currency: 'usd',
          payment_status: 'paid',
          status: 'completed',
        });

        // Redirect to success page
        window.location.href = `${config.app.url}/success?session_id=test_session_${Date.now()}`;
        return;
      }

      const checkoutSession = await this.createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
      });

      if (checkoutSession.url) {
        window.location.href = checkoutSession.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error purchasing product:', error);
      throw error;
    }
  }

  static hasActiveSubscription(subscription: SubscriptionData | null): boolean {
    if (!subscription) return false;
    
    const activeStatuses = ['active', 'trialing'];
    return activeStatuses.includes(subscription.subscription_status);
  }

  static hasPurchasedProduct(orders: OrderData[], productPriceId: string): boolean {
    return orders.some(order => 
      order.payment_status === 'paid' && 
      order.order_status === 'completed'
    );
  }
}
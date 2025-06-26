import { supabase } from '../lib/supabase';

export interface CheckoutSessionRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  mode: 'payment';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
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
      
      // Use the current domain for redirect URLs
      const currentDomain = window.location.origin;
      const defaultSuccessUrl = `${currentDomain}/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${currentDomain}/pricing`;

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

  static async purchaseProduct(product: any): Promise<void> {
    try {
      const checkoutSession = await this.createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
      });

      if (checkoutSession.url) {
        // Redirect to Stripe checkout
        window.location.href = checkoutSession.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error purchasing product:', error);
      throw error;
    }
  }

  static hasPurchasedPremium(orders: OrderData[]): boolean {
    return orders.some(order => 
      order.payment_status === 'paid' && 
      order.order_status === 'completed'
    );
  }

  static isPremiumUser(orders: OrderData[]): boolean {
    return this.hasPurchasedPremium(orders);
  }

  // Check if user has premium access via database function
  static async checkPremiumAccess(): Promise<boolean> {
    try {
      // First try to get the premium status directly from the users table
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      // Check premium_status from users table first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('premium_status')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user premium status:', userError);
        return false;
      }

      // If premium_status is true, return true immediately
      if (userData?.premium_status) {
        return true;
      }

      // Fall back to checking orders
      const orders = await this.getUserOrders();
      return this.isPremiumUser(orders);
    } catch (error) {
      console.error('Error in checkPremiumAccess:', error);
      return false;
    }
  }
}
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { Product } from '../stripe-config';

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

  static async purchaseProduct(product: Product): Promise<void> {
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
      const { data, error } = await supabase.rpc('user_has_premium_access', {
        user_id_param: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) {
        console.error('Error checking premium access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }
}
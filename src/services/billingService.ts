import { supabase } from '../lib/supabase';

export class PremiumRequiredError extends Error {
  constructor() {
    super('Premium unlock required');
    this.name = 'PremiumRequiredError';
  }
}

async function authedFunction(name: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to continue');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload: { error?: string; code?: string; url?: string; alreadyPremium?: boolean; premium?: boolean } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    if (response.status === 402 || payload.code === 'PREMIUM_REQUIRED') {
      throw new PremiumRequiredError();
    }
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

export async function startPremiumCheckout() {
  const payload = await authedFunction('create-checkout-session', {});
  if (payload.alreadyPremium) return { alreadyPremium: true as const };
  if (!payload.url) throw new Error('Stripe did not return a checkout link');
  window.location.assign(payload.url);
  return { alreadyPremium: false as const };
}

export async function confirmPremiumCheckout(sessionId: string) {
  const payload = await authedFunction('confirm-checkout', { sessionId });
  return Boolean(payload.premium);
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function stripeRequest(
  secretKey: string,
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };
  let body: string | undefined;
  if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeStripeValue(value)}`)
      .join('&');
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || 'Stripe request failed';
    throw new Error(message);
  }
  return json;
}

function encodeStripeValue(value: string): string {
  // Stripe replaces the raw {CHECKOUT_SESSION_ID} token. URL-encoding the braces breaks it.
  return encodeURIComponent(value).replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || age > 300 || age < -300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

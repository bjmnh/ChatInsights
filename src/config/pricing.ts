/**
 * Customer-facing price for the one-time premium unlock.
 *
 * Change `amountCents` here when the price changes. Every pricing surface
 * and the legal pages read this object. The Stripe Price ID is not stored
 * in the repo — set it as the STRIPE_PRICE_ID edge secret, and keep that
 * Price as a one-time (mode=payment) charge for this same amount.
 */
export const PREMIUM_UNLOCK = {
  amountCents: 999,
  currency: 'USD',
  cadence: 'one-time',
} as const;

export function formatPremiumPrice(
  unlock: typeof PREMIUM_UNLOCK = PREMIUM_UNLOCK,
): string {
  const dollars = (unlock.amountCents / 100).toFixed(2);
  return `$${dollars} ${unlock.currency}`;
}

/** "$9.99 USD one-time" — derived from PREMIUM_UNLOCK. */
export function formatPremiumPriceLine(
  unlock: typeof PREMIUM_UNLOCK = PREMIUM_UNLOCK,
): string {
  return `${formatPremiumPrice(unlock)} ${unlock.cadence}`;
}

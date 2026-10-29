/**
 * DRAFT — owner and counsel review only. Not legal advice.
 * Do not show a draft banner in the UI. Replace every [PLACEHOLDER] before relying on this page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument, LegalPlaceholder } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';
import { formatPremiumPriceLine } from '../config/pricing';

const RefundPage: React.FC = () => {
  return (
    <LegalDocument
      title="Refund Policy"
      lede="The premium unlock is a one-time digital purchase. All sales are final."
    >
      <section>
        <h2>1. What you buy</h2>
        <p>
          The premium unlock costs {formatPremiumPriceLine()}. Stripe charges that amount once,
          when you complete Checkout. There is no subscription, no renewal, and no later charge for
          the same unlock. The purchase is delivered digitally: premium report generation becomes
          available on the account that paid.
        </p>
      </section>

      <section>
        <h2>2. No refunds</h2>
        <p>
          <strong>All sales are final.</strong> We do not refund the premium unlock because you
          changed your mind, because a report was not what you hoped, because you did not use the
          unlock, or because you deleted your uploads. Generating or not generating premium cards
          does not create a refund right.
        </p>
        <p className="mt-3">
          The only exception is where the law requires a refund. Nothing in this policy limits a
          non-waivable right you have under the law that applies to you. If you believe such a right
          applies, email <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder> with the email on
          the account and your Stripe receipt. We will respond within{' '}
          <LegalPlaceholder>{LEGAL.responseTime}</LegalPlaceholder>.
        </p>
      </section>

      <section>
        <h2>3. If a refund is issued</h2>
        <p>
          When the law requires a refund, or Stripe otherwise completes a refund on that charge, the
          money goes back to the original payment method through Stripe. Timing depends on Stripe
          and the card issuer. A refunded charge removes the premium unlock from the account when no
          other paid purchase remains on it.
        </p>
      </section>

      <section>
        <h2>4. What we do not store</h2>
        <p>
          We never see or store your full card number. Stripe processes the payment. Do not send card
          numbers by email.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>
        </p>
        <p className="mt-3">
          This policy is part of the <Link to="/terms">Terms of Service</Link>. How we handle payment
          records is described in the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalDocument>
  );
};

export default RefundPage;

/**
 * DRAFT — owner and counsel review only. Not legal advice.
 * Do not show a draft banner in the UI. Replace every [PLACEHOLDER] before relying on this page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument, LegalPlaceholder } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';
import { formatPremiumPriceLine } from '../config/pricing';

const ContactPage: React.FC = () => {
  return (
    <LegalDocument
      title="Contact and support"
      lede="How to reach us about your account, a deletion request, or a payment."
    >
      <section>
        <h2>Write to us</h2>
        <p>
          <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>
          <br />
          Email: <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>
        </p>
        <p className="mt-3">
          We aim to reply within <LegalPlaceholder>{LEGAL.responseTime}</LegalPlaceholder>. Include
          the email address on your Chat Insights account so we can find it.
        </p>
      </section>

      <section>
        <h2>Delete an upload</h2>
        <p>
          Uploaded files and the reports made from them stay in your account until you delete them.
          We do not delete an upload automatically after a report is generated. Use Delete on the
          dashboard to remove a file from storage and its reports from the database.
        </p>
      </section>

      <section>
        <h2>Delete an account</h2>
        <p>
          The app does not include a control that closes an account. Email{' '}
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder> from the address on the account
          and ask us to delete it. Say what you want removed. We will respond within{' '}
          <LegalPlaceholder>{LEGAL.responseTime}</LegalPlaceholder>. Payment records may be kept
          where we need them for accounting, tax, or disputes, as described in the{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>
          Premium is a one-time purchase of {formatPremiumPriceLine()}. It is not a subscription and
          it does not renew. We do not store your card number. Stripe does the charge.
        </p>
        <p className="mt-3">
          <strong>All sales are final</strong>, except where the law requires a refund. If you
          believe that exception applies, email{' '}
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder> with your account email and the
          Stripe receipt. Read the <Link to="/refunds">Refund Policy</Link> before you write.
        </p>
      </section>

      <section>
        <h2>Policies</h2>
        <ul>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/refunds">Refund Policy</Link></li>
        </ul>
      </section>
    </LegalDocument>
  );
};

export default ContactPage;

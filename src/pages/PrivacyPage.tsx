/**
 * DRAFT — owner and counsel review only. Not legal advice.
 * Do not show a draft banner in the UI. Replace every [PLACEHOLDER] before relying on this page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument, LegalPlaceholder } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';
import { formatPremiumPriceLine } from '../config/pricing';

const PrivacyPage: React.FC = () => {
  return (
    <LegalDocument
      title="Privacy Policy"
      lede="How Chat Insights collects, uses, and keeps the chat export you choose to upload."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          Chat Insights (“we,” “us”) is a web app that builds reports from a chat export you upload.
          It is operated by <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>,{' '}
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>.
          Chat Insights is an independent service. It is not affiliated with, endorsed by, or
          sponsored by the companies that make the chat products you export from.
        </p>
        <p className="mt-3">
          Contact: <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>. See also our{' '}
          <Link to="/contact">Contact</Link> page.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account data.</strong> Your email address and the authentication details handled
            by Supabase Auth. If you sign in with a provider, we may also receive a name or avatar
            that provider sends.
          </li>
          <li>
            <strong>Your uploaded chat export.</strong> The conversations you choose to upload, as a
            JSON file or a zip that contains one. A chat export can include sensitive information
            about you and about other people. Upload only data you have the right to use.
          </li>
          <li>
            <strong>Reports.</strong> The statistics and, for a premium report, the generated cards
            stored on your account.
          </li>
          <li>
            <strong>Payment data.</strong> Payments are processed by Stripe. We receive and store a
            Stripe customer id, checkout session id, payment status, amount, currency, and whether
            your account has the premium unlock. We do not see or store your full card number.
          </li>
          <li>
            <strong>Technical data.</strong> Standard server logs kept by our hosting providers, such
            as IP address, browser type, and request time.
          </li>
          <li>
            <strong>Sign-in storage in your browser.</strong> We do not run an advertising or
            analytics cookie program. Supabase Auth keeps your session in browser storage so you
            stay signed in. Stripe and our hosts may set cookies required to take a payment or
            serve the site.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use it</h2>
        <p>
          We use this information to run your account, turn an upload into a report, take the
          one-time premium payment, prevent abuse, and answer support requests. We do not sell your
          data. We do not use your uploaded conversations to advertise, and we do not use them to
          train a model of our own.
        </p>
        <p className="mt-3">
          The free basic report is a heuristic. It counts messages, words, and similar statistics in
          our own code. It is not sent to a language model. A premium report is the only report that
          uses a language model. When you generate one, the text of your messages from the
          conversations you selected is sent to Google’s Gemini API so Gemini can write the cards.
          No other model provider processes that text for us.
        </p>
      </section>

      <section>
        <h2>4. Who processes it</h2>
        <ul>
          <li>
            <strong>Supabase</strong> hosts authentication, the database, file storage, and the
            server functions that build reports.
          </li>
          <li>
            <strong>Netlify</strong> hosts the website.
          </li>
          <li>
            <strong>Google (Gemini API)</strong> receives the message text needed to produce a
            premium report. Google’s use of that text is governed by Google’s terms for the API key
            we use. This policy does not describe or promise Google’s retention or training
            practices.
          </li>
          <li>
            <strong>Stripe</strong> processes the one-time payment and related fraud checks under
            Stripe’s own privacy policy.
          </li>
        </ul>
        <p className="mt-3">
          These providers may process data in the United States and in other countries.
        </p>
      </section>

      <section>
        <h2>5. Storage and retention</h2>
        <p>
          Your uploaded file and the reports made from it stay in your account until you delete
          them. We do not automatically delete an upload after a report is generated.
        </p>
        <p className="mt-3">
          You can delete an uploaded file and its reports from the dashboard. That removes the file
          from storage and the related reports from the database. There is no separate control in
          the app for deleting the whole account. To ask us to delete your account or other personal
          data, email <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>. We will respond
          within <LegalPlaceholder>{LEGAL.responseTime}</LegalPlaceholder>.
        </p>
        <p className="mt-3">
          Payment records are kept as long as we need them for accounting, tax, and fraud or dispute
          handling. Backups and logs held by our providers may remain for a limited time after you
          delete something.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          Data is sent over HTTPS. Uploaded files are kept in a private storage bucket, and database
          rules limit access to your files and reports to your account. Our providers supply the
          infrastructure those controls run on. No system is perfectly secure, and we cannot
          guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>7. Your choices</h2>
        <p>
          You can read your reports in the app, delete uploads and reports from the dashboard, and
          email us to request access, correction, or deletion. Depending on where you live — for
          example in the EEA, the UK, or California — you may have additional rights. Contact us to
          use them.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          Chat Insights is not for children under 13, or under 16 where that higher age is required.
          Contact <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder> if you believe a child
          has given us personal data.
        </p>
      </section>

      <section>
        <h2>9. International transfers</h2>
        <p>
          If you use the service from outside the country where our providers operate, your
          information may be processed in the United States and in other countries where those
          providers run their systems. Those countries may not offer the same data-protection rules
          as your own.
        </p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>
          We will post updates on this page and change the date above. The premium purchase described
          in the <Link to="/terms">Terms</Link> is a one-time payment of {formatPremiumPriceLine()},
          not a subscription.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>
        </p>
        <p className="mt-3">
          Questions about a payment: see the <Link to="/refunds">Refund Policy</Link>.
        </p>
      </section>
    </LegalDocument>
  );
};

export default PrivacyPage;

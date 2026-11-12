/**
 * DRAFT — owner and counsel review only. Not legal advice.
 * Do not show a draft banner in the UI. Replace every [PLACEHOLDER] before relying on this page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument, LegalPlaceholder } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';

const TermsPage: React.FC = () => {
  return (
    <LegalDocument
      title="Terms of Service"
      lede="The rules for using Chat Insights. A read is free. You pay your own model provider."
    >
      <section>
        <h2>1. Acceptance and eligibility</h2>
        <p>
          These Terms of Service (“Terms”) are a contract between you and{' '}
          <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder> (“we,” “us”),{' '}
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>, for the Chat Insights website and
          related services (the “Service”).
        </p>
        <p className="mt-3">
          Chat Insights is an independent service. It is not affiliated with, endorsed by, or
          sponsored by the companies that make the chat products you export from. The Service reads
          an export you supply. It is not a client of any particular chat product.
        </p>
        <p className="mt-3">
          By creating an account or using the Service, you agree to these Terms and to the{' '}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
          You must be 18 or older. The read asks you to confirm that before it starts.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          You drop a chat export in the browser. A local pass can show counts with no model call.
          If you continue, you supply your own API key, pick a model, and pick a depth. The browser
          sends packed text to the provider you chose. You can download the case file, and you can
          save it to an account. Details are in the <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p className="mt-3">
          The read is free. These Terms do not describe a purchase or a subscription. A donation
          link, if one is shown, is optional and is not required to use the Service.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          You are responsible for the activity on your account and for keeping your sign-in
          credentials private. Tell us at <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>{' '}
          if you believe someone else is using your account. We may refuse a registration or suspend
          an account that breaks these Terms.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You keep ownership of the chat export and of any case file we store for you. You grant us
          a limited license to store a case file you choose to save, only so we can show it back to
          you. We do not take a license to the raw export, because the read does not upload it. The
          license for a saved case file lasts until you ask us to delete it. Self-serve deletion is
          not available yet.
        </p>
        <p className="mt-3">
          You confirm that you have the rights needed to process the export, including any messages
          from other people that appear in it, and that using it here does not break the law or
          anyone else’s rights. Do not process unlawful content.
        </p>
      </section>

      <section>
        <h2>5. Language-model processing</h2>
        <p>
          The model is the one you pick, billed by your provider, with your key. We do not operate
          that model and we do not promise that every model will extract equally well. Output can be
          wrong, incomplete, or partial when a budget or a depth stops the read. See section 8.
        </p>
      </section>

      <section>
        <h2>6. Price</h2>
        <p>
          We do not charge for an account or a read. The API bill is between you and the provider
          whose key you use. A donation link, if configured, is optional. If we introduce a charge
          later, we will update these Terms and say so in the product before any payment is
          requested.
        </p>
      </section>

      <section>
        <h2>8. Reports are not advice</h2>
        <p>
          Reports are for self-reflection. They may be inaccurate, and a partial report is labeled
          partial. They are not medical, psychological, legal, financial, or other professional
          advice, and you should not rely on them as a complete picture of you or of anyone else.
          The exposure card is not a security audit. Do not treat it as proof that personal data is
          or is not present in an export. If a report mentions distress, the support line is not
          crisis care.
        </p>
      </section>

      <section>
        <h2>9. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break the law, or upload content you do not have the right to process;</li>
          <li>probe or disrupt the Service or its providers;</li>
          <li>use the Service to harm, harass, or dox another person;</li>
          <li>resell access, or scrape the Service in a way that degrades it for others;</li>
          <li>misrepresent the reports as facts we have verified, or as our professional advice.</li>
        </ul>
      </section>

      <section>
        <h2>10. Stopping and suspension</h2>
        <p>
          You may stop using the Service at any time. You can forget a key stored on this device
          from the setup screen. A saved case file does not yet have a self-serve delete control,
          and the app does not include a control that closes the whole account. To ask us to delete
          a saved case file or close your account, email{' '}
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>.
        </p>
        <p className="mt-3">
          We may suspend or end access if you break these Terms, if we must do so to comply with the
          law, or if continuing the Service becomes unlawful. Sections that should survive — including
          ownership, disclaimers, and liability limits — survive.
        </p>
      </section>

      <section>
        <h2>11. Disclaimers and liability</h2>
        <p>
          The Service is provided “as is” and “as available.” To the fullest extent the law allows,
          we disclaim warranties of merchantability, fitness for a particular purpose, and
          non-infringement, and we do not warrant that reports will be accurate, that the Service
          will be uninterrupted, or that a given upload will produce a particular card.
        </p>
        <p className="mt-3">
          To the fullest extent the law allows, <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>{' '}
          and its directors, employees, and suppliers will not be liable for indirect, incidental,
          special, consequential, or punitive damages, or for lost profits, data, or goodwill. Our
          total liability for claims arising out of the Service will not exceed the amount you paid
          us. The service is currently free, so that amount is zero. Some places do not allow these
          limits. In those places, the limits apply only as far as the law allows.
        </p>
      </section>

      <section>
        <h2>12. Governing law</h2>
        <p>
          These Terms are governed by the laws of{' '}
          <LegalPlaceholder>{LEGAL.governingState}</LegalPlaceholder>, without regard to conflict-of-law
          rules. Courts located in <LegalPlaceholder>{LEGAL.governingState}</LegalPlaceholder> are
          the exclusive venue for disputes arising out of these Terms or the Service, except where
          the law gives you the right to bring a claim somewhere else. If a provision is held
          unenforceable, the rest of the Terms stay in effect. These Terms, the Privacy Policy, and
          these Terms and the Privacy Policy are the entire agreement about the Service and replace
          earlier agreements about it.
        </p>
      </section>

      <section>
        <h2>13. Changes</h2>
        <p>
          We may update these Terms by posting the new version on this page and changing the date
          above. If you keep using the Service after the update, you accept the new Terms. An update
          will not, by itself, create a charge. The service is currently free.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          <LegalPlaceholder>{LEGAL.entityName}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.address}</LegalPlaceholder>
          <br />
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>
        </p>
        <p className="mt-3">
          Questions: <Link to="/contact">Contact</Link>. The service is currently free.
        </p>
      </section>
    </LegalDocument>
  );
};

export default TermsPage;

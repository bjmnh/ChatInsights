/**
 * DRAFT — owner and counsel review only. Not legal advice.
 * Do not show a draft banner in the UI. Replace every [PLACEHOLDER] before relying on this page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument, LegalPlaceholder } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';

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
            <strong>Account data, only if you sign in.</strong> Your email address and the
            authentication details handled by Supabase Auth. A read works without an account. If you
            sign in with a provider, we may also receive a name or avatar that provider sends.
          </li>
          <li>
            <strong>The export, on your device.</strong> Parsing and the local pass happen in your
            browser. We do not upload the raw export. A chat export can include sensitive information
            about you and about other people. Use only data you have the right to use.
          </li>
          <li>
            <strong>Your API key, on your device.</strong> It stays in memory unless you turn on
            Remember on this device. That option stores ciphertext in this browser. We do not send
            the key to our servers for storage.
          </li>
          <li>
            <strong>A saved case file, only if you save one.</strong> The finished JSON, which can
            include health, money, and relationship details. Not the key, and not the raw export.
          </li>
          <li>
            <strong>Technical data.</strong> Standard server logs kept by our hosting providers, such
            as IP address, browser type, and request time. The pass-through described below is built
            not to log request bodies or keys.
          </li>
          <li>
            <strong>Sign-in storage in your browser.</strong> We do not run an advertising or
            analytics cookie program. Supabase Auth keeps your session in browser storage so you
            stay signed in. Our hosts may set cookies required to serve the site.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How a read works</h2>
        <p>
          You pick the provider and the model, and you pay that provider. Chat Insights does not
          embed a shared API key and does not buy the tokens. Before a run, the page shows an
          estimate and a short note about that provider’s data use, with a link to their terms.
          That note is a summary, not a guarantee from us.
        </p>
        <p className="mt-3">
          By default the browser calls the provider directly. Emails, phone numbers, and card-like
          numbers are masked first. Names and the rest of the personal detail stay, because that is
          what the report is about. On that path our servers do not see the key or the chat text.
        </p>
        <p className="mt-3">
          If a provider blocks the browser, a stateless Netlify pass-through can stream that one
          batch to an allowlisted host. It does not persist the body or the key, it does not forward
          the browser’s Origin header, and it refuses localhost and private addresses. The progress
          screen says when a batch takes that path. The service is free to use. An optional donation
          link may appear if one is configured. We do not sell your data, and we do not train a
          model of our own on your chats.
        </p>
      </section>

      <section>
        <h2>4. Who processes it</h2>
        <ul>
          <li>
            <strong>Supabase</strong> hosts authentication and, if you save a case file, the
            database row for that file.
          </li>
          <li>
            <strong>Netlify</strong> hosts the website and, only when a provider blocks the browser,
            the pass-through described above.
          </li>
          <li>
            <strong>The provider you choose</strong> receives the packed batch. Their terms apply.
            For Gemini, unpaid quota may be used to improve Google’s products, and paid services are
            described differently in Google’s API terms. Read the note on the setup screen.
          </li>
        </ul>
        <p className="mt-3">
          These providers may process data in the United States and in other countries.
        </p>
      </section>

      <section>
        <h2>5. Storage and retention</h2>
        <p>
          A case file you save stays on your account until you ask us to delete it. Self-serve
          deletion is not available yet. There is no control in the app that closes the whole
          account. To ask us to delete a saved case file or your account, email{' '}
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder>. We will respond within{' '}
          <LegalPlaceholder>{LEGAL.responseTime}</LegalPlaceholder>.
        </p>
        <p className="mt-3">
          The read itself can leave a checkpoint in this browser so a closed tab can resume. You
          can forget a remembered API key from the setup screen. Older uploads from a previous
          version of the site, if you still have them, are not given a new delete button here; email
          us and we will remove them.
        </p>
        <p className="mt-3">
          The service does not charge for a read. If a donation link is shown, it is optional and
          leaves this site. We do not collect card numbers through this app. Backups and logs held
          by our providers may remain for a limited time after something is deleted.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          Data is sent over HTTPS. Saved case files are limited to your account by database rules.
          A remembered key is encrypted in this browser. That protects against casual inspection of
          the disk. It does not protect against malware, or against a script that runs on this
          origin. The site sends a strict Content-Security-Policy so pages do not load unexpected
          scripts. No system is perfectly secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>7. Your choices</h2>
        <p>
          You can read a report without an account, download the case file as JSON, and email us to
          request access, correction, or deletion. Self-serve deletion of a saved case file is not
          available yet. Depending on where you live — for example in the EEA, the UK, or California —
          you may have additional rights. Contact us to use them.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          The read is for adults. Before a run you confirm you are 18 or older. Contact{' '}
          <LegalPlaceholder>{LEGAL.contactEmail}</LegalPlaceholder> if you believe a child has given
          us personal data.
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
          We will post updates on this page and change the date above. The service is currently free.
          If that changes, the <Link to="/terms">Terms</Link> will say so before a charge exists.
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
      </section>
    </LegalDocument>
  );
};

export default PrivacyPage;

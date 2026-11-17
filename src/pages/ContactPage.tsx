/**
 * Chat Insights is a personal hobby project. This page is not a business notice.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalDocument } from '../components/legal/LegalDocument';
import { LEGAL } from '../config/legal';

const ContactPage: React.FC = () => {
  return (
    <LegalDocument
      title="Contact"
      lede="Chat Insights is a personal hobby project, not a business."
    >
      <section>
        <h2>Who this is</h2>
        <p>
          I keep Chat Insights up in my spare time. It is not a company, and there is no business
          address behind it.
        </p>
      </section>

      <section>
        <h2>Email</h2>
        <p>
          Questions, including privacy and data questions, can go to{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>Policies</h2>
        <ul>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
        </ul>
      </section>
    </LegalDocument>
  );
};

export default ContactPage;

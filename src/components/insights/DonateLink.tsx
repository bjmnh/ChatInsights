import React from 'react';
import { donationHref } from '../../lib/insights/donation';

const DonateLink: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const href = donationHref(import.meta.env.VITE_DONATION_URL);
  if (!href) return null;
  return (
    <a href={href} className={className} rel="noreferrer" target="_blank">
      {children ?? 'Tip the person who built this'}
    </a>
  );
};

export default DonateLink;

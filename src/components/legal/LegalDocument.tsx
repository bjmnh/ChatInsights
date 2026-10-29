import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_LAST_UPDATED } from '../../config/legal';

export const LegalPlaceholder: React.FC<{ children: string }> = ({ children }) => (
  <span className="mx-0.5 inline-block rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-foreground">
    {children}
  </span>
);

const links = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
];

export const LegalDocument: React.FC<{
  title: string;
  lede: string;
  children: React.ReactNode;
}> = ({ title, lede, children }) => (
  <article className="mx-auto max-w-3xl px-4 py-16">
    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Chat Insights</p>
    <h1 className="mt-3 font-display text-5xl">{title}</h1>
    <p className="mt-4 text-muted-foreground">{lede}</p>
    <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>
    <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-foreground [&_li]:mt-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      {children}
    </div>
    <nav className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm text-muted-foreground">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className="hover:text-foreground">
          {link.label}
        </Link>
      ))}
    </nav>
  </article>
);

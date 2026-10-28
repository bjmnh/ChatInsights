import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="font-display text-2xl">Chat Insights</Link>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A personal read of the archive you already built with ChatGPT, Grok, and the rest.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <a href="/#pricing" className="hover:text-foreground">Pricing</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

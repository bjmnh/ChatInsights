import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
    <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">404</p>
    <h1 className="mt-3 font-display text-5xl">Page not found</h1>
    <p className="mt-4 text-muted-foreground">That address is not a page on Chat Insights.</p>
    <Link to="/" className="mt-8 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Back home</Link>
  </div>
);

export default NotFoundPage;

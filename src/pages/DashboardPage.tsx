import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCaseFiles, type SavedCaseSummary } from '../services/caseFileService';
import { loadCheckpoint, type LocalCheckpoint } from '../lib/insights/browserStore';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedCaseSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState<LocalCheckpoint | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadCheckpoint().then(setCheckpoint).catch(() => undefined);
    listCaseFiles(user.id)
      .then(setRows)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load saved reports');
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Saved reports</h1>
          <p className="mt-2 text-muted-foreground">Case files you chose to keep. Not the API key, and not the raw export.</p>
        </div>
        <Link to="/read" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Read an export</Link>
      </div>
      {checkpoint?.caseFile && (
        <p className="mt-6 text-sm text-muted-foreground">
          This browser still has the last read. <Link to="/read" className="text-primary underline">Open it</Link>.
        </p>
      )}
      {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="mt-8 text-sm text-muted-foreground">
          {error}. Saving needs the case file table from the migration in this repo. It is not applied to the live project from this branch. You can still download a report as JSON.
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">No saved case files yet.</p>
      )}
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={`/saved/${row.id}`} className="block rounded-2xl border border-white/10 px-4 py-3 hover:border-white/30">
              <span className="font-medium">{row.filename || 'Export'}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {row.partial ? 'Partial' : 'Complete'} · {row.depth} · {row.model_provider} {row.model_id}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardPage;

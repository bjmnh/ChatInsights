import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCaseFiles, type SavedCaseSummary } from '../services/caseFileService';
import { clearCheckpoint, loadCheckpoint, subscribeLocalReadCleared, type LocalCheckpoint } from '../lib/insights/browserStore';
import { canShowCheckpoint } from '../lib/insights/localRead';
import { formatFiledDate } from '../lib/insights/hydratePremium';
import { displayBadge, savedModelLabel } from '../lib/insights/merge';
import { isExpiredSession, requestSessionExpiry } from '../lib/authSession';

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedCaseSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState<LocalCheckpoint | null>(null);

  useEffect(() => subscribeLocalReadCleared(() => setCheckpoint(null)), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    loadCheckpoint().then((checkpoint) => {
      if (!canShowCheckpoint(checkpoint, user.id)) {
        setCheckpoint(null);
        if (checkpoint?.ownerId && checkpoint.ownerId !== user.id) clearCheckpoint().catch(() => undefined);
        return;
      }
      setCheckpoint(checkpoint);
    }).catch(() => undefined);
    listCaseFiles(user.id)
      .then(setRows)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not load saved reports';
        if (isExpiredSession({ message })) {
          requestSessionExpiry();
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Saved reports</h1>
          <p className="mt-2 text-muted-foreground">Case files you chose to keep. The API key is not in the case file. An uploaded export is stored separately for security review.</p>
        </div>
        <Link to="/read" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Read an export</Link>
      </div>
      {user && checkpoint?.caseFile && canShowCheckpoint(checkpoint, user.id) && (
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
                {(row.case_file ? displayBadge(row.case_file) : (row.partial ? 'Partial report' : 'Complete report'))}
                {' · '}
                {savedModelLabel(row.model_provider, row.model_id)}
                {formatFiledDate(row.case_file?.filedAt || row.updated_at) ? ` · Updated ${formatFiledDate(row.case_file?.filedAt || row.updated_at)}` : ''}
                {row.created_at && formatFiledDate(row.created_at) !== formatFiledDate(row.case_file?.filedAt || row.updated_at)
                  ? ` · Created ${formatFiledDate(row.created_at)}`
                  : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardPage;

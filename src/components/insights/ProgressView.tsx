import React, { useEffect, useState } from 'react';
import { Progress } from '../ui/progress';
import type { RunProgress } from '../../lib/insights/runner';

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

const ProgressView: React.FC<{
  progress: RunProgress;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
}> = ({ progress, paused, onPause, onResume }) => {
  const [elapsed, setElapsed] = useState(0);
  const [stillWaiting, setStillWaiting] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    setStillWaiting(false);
    const id = window.setTimeout(() => setStillWaiting(true), 30_000);
    return () => window.clearTimeout(id);
  }, [progress.message]);
  const tracked = progress.planned > 0 ? progress.planned : progress.totalBatches;
  const done = progress.planned > 0 ? progress.read : progress.completedBatches;
  const denom = Math.max(1, tracked);
  const value = progress.phase === 'done' ? 100 : Math.min(99, Math.round((done / denom) * 100));
  return (
    <div data-testid="progress" className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Reading</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl">{progress.message}</h2>
      <Progress value={value} className="mt-8 h-2" />
      <p className="mt-4 text-sm text-muted-foreground">
        {progress.read} of {progress.planned} selected conversations accounted for. Batches go out one at a time, with a wait if the provider asks.
      </p>
      <p className="mt-2 text-sm text-muted-foreground" data-testid="elapsed">Elapsed {formatElapsed(elapsed)}.</p>
      {stillWaiting && progress.phase !== 'done' && (
        <p className="mt-2 text-sm text-amber-100" data-testid="still-waiting">Still waiting on the provider.</p>
      )}
      <p className="mt-2 text-sm text-muted-foreground" data-testid="route-note">
        {progress.routeLine}
      </p>
      {progress.viaProxy && (
        <p className="mt-4 rounded-2xl border border-white/15 px-4 py-3 text-sm" data-testid="proxy-notice">
          This batch is passing through Chat Insights’ server because the browser could not call the provider directly. It goes to an allowlisted host, in memory only, and is not stored.
        </p>
      )}
      <div className="mt-6">
        {paused ? (
          <button type="button" onClick={onResume} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Resume</button>
        ) : (
          <button type="button" onClick={onPause} className="rounded-full border border-white/15 px-4 py-2 text-sm" disabled={progress.phase === 'done'}>Pause</button>
        )}
      </div>
    </div>
  );
};

export default ProgressView;

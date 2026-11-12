import React from 'react';
import { Progress } from '../ui/progress';
import type { RunProgress } from '../../lib/insights/runner';

const ProgressView: React.FC<{
  progress: RunProgress;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
}> = ({ progress, paused, onPause, onResume }) => {
  const denom = Math.max(1, progress.totalBatches);
  const value = progress.phase === 'done' ? 100 : Math.min(99, Math.round((progress.completedBatches / denom) * 100));
  return (
    <div data-testid="progress" className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Reading</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl">{progress.message}</h2>
      <Progress value={value} className="mt-8 h-2" />
      <p className="mt-4 text-sm text-muted-foreground">
        {progress.read} of {progress.planned} selected conversations accounted for. Batches go out one at a time, with a wait if the provider asks.
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

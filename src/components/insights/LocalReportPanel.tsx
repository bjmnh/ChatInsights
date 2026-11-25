import React from 'react';
import { localReportView } from '../../lib/insights/localReport';
import type { LocalReport } from '../../lib/insights/localPass';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HeatCells({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
      {counts.map((count, index) => (
        <div
          key={labels[index] ?? index}
          title={`${labels[index]}: ${count}`}
          className="rounded-sm border border-white/10 px-1 py-2 text-center"
          style={{ backgroundColor: count ? `rgba(251, 191, 36, ${0.15 + 0.75 * (count / max)})` : 'transparent' }}
        >
          <span className="block font-mono text-[10px] text-amber-50">{labels[index]}</span>
          <span className="sr-only">{count}</span>
        </div>
      ))}
    </div>
  );
}

const LocalReportPanel: React.FC<{ report: LocalReport }> = ({ report }) => {
  const view = localReportView(report);
  return (
    <div className="mt-8 space-y-8" data-testid="local-report">
      <section>
        <h2 className="font-display text-2xl">People mentioned</h2>
        {view.people.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No names stood out in the messages you sent.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {view.people.map((person) => (
              <li key={person.name} className="rounded-full border border-white/15 px-3 py-1 text-sm">
                {person.name} <span className="text-muted-foreground">· {person.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-display text-2xl">When you write</h2>
        <p className="mt-1 text-sm text-muted-foreground">Hours and weekdays are UTC, counted from message timestamps.</p>
        <div className="mt-3">
          <HeatCells counts={view.hours} labels={view.hours.map((_, hour) => String(hour))} />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {view.weekdays.map((count, index) => (
            <div key={WEEKDAYS[index]} className="rounded-sm border border-white/10 px-1 py-2 text-center text-xs" title={`${WEEKDAYS[index]}: ${count}`}>
              <span className="block text-amber-50">{WEEKDAYS[index]}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
        {view.peakHours.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Busiest hours: {view.peakHours.map((hour) => `${hour}:00`).join(', ')} UTC.</p>
        )}
      </section>
      <section>
        <h2 className="font-display text-2xl">Flagged chats</h2>
        <p className="mt-1 text-sm text-muted-foreground">{view.flagged} of {view.conversations} chats matched a sensitive or notable reason.</p>
        {view.reasons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing was flagged.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {view.reasons.map((reason) => (
              <li key={reason.id} className="flex justify-between gap-4 border-b border-white/10 py-1">
                <span>{reason.label}</span>
                <span className="font-mono text-muted-foreground">{reason.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-display text-2xl">What the file exposes</h2>
        <p className="mt-1 text-sm text-muted-foreground">Counts only. The addresses and numbers stay in the export on this device.</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Emails</dt><dd className="font-mono text-lg">{view.exposure.emails}</dd></div>
          <div><dt className="text-muted-foreground">Phones</dt><dd className="font-mono text-lg">{view.exposure.phones}</dd></div>
          <div><dt className="text-muted-foreground">Card-like</dt><dd className="font-mono text-lg">{view.exposure.cardLike}</dd></div>
          <div><dt className="text-muted-foreground">Links</dt><dd className="font-mono text-lg">{view.exposure.urls}</dd></div>
          <div><dt className="text-muted-foreground">Key-like</dt><dd className="font-mono text-lg">{view.exposure.keyLike}</dd></div>
          <div><dt className="text-muted-foreground">Chats with an identifier</dt><dd className="font-mono text-lg">{view.exposure.chats}</dd></div>
        </dl>
      </section>
      <section>
        <h2 className="font-display text-2xl">Usage</h2>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm uppercase tracking-wide text-muted-foreground">By month</h3>
            {view.byMonth.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No dates on these chats.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {view.byMonth.map((row) => (
                  <li key={row.month} className="flex justify-between gap-4"><span>{row.month}</span><span className="font-mono">{row.count}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm uppercase tracking-wide text-muted-foreground">By source</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {view.providers.map((row) => (
                <li key={row.name} className="flex justify-between gap-4"><span>{row.name}</span><span className="font-mono">{row.count}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LocalReportPanel;

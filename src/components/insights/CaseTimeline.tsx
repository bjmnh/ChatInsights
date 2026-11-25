import React, { useMemo, useState } from 'react';
import type { CaseFile } from '../../lib/insights/merge';
import { monthSpine, spineChoices, type SpineKind } from '../../lib/insights/timeline';

const CaseTimeline: React.FC<{
  caseFile: CaseFile;
  onOpen: (id: string, quote: string | null) => void;
}> = ({ caseFile, onOpen }) => {
  const choices = useMemo(() => spineChoices(caseFile), [caseFile]);
  const [selected, setSelected] = useState('');
  const choice = choices.find((item) => `${item.kind}:${item.label}` === selected) ?? choices[0];
  const dots = choice ? monthSpine(caseFile, choice.kind, choice.label) : [];
  const months = [...new Set(dots.map((dot) => dot.month))];
  if (!choices.length) return null;
  return (
    <section className="mb-12" data-testid="case-timeline">
      <h2 className="font-display text-3xl text-white">Timeline</h2>
      <p className="mt-2 text-sm text-gray-300">A month spine for one person, project, or worry. A dot opens the source chat.</p>
      <label className="mt-4 block text-sm text-gray-200">
        Show
        <select
          className="mt-1 block rounded-md border border-white/20 bg-black/40 px-2 py-1 text-white"
          value={choice ? `${choice.kind}:${choice.label}` : ''}
          onChange={(event) => setSelected(event.target.value)}
        >
          {choices.map((item) => (
            <option key={`${item.kind}:${item.label}`} value={`${item.kind}:${item.label}`}>{item.kind}: {item.label}</option>
          ))}
        </select>
      </label>
      {months.length === 0 ? (
        <p className="mt-4 text-sm text-gray-300">These notes don’t have months yet.</p>
      ) : (
        <ol className="mt-6 flex gap-6 overflow-x-auto pb-2">
          {months.map((month) => (
            <li key={month} className="min-w-28">
              <p className="font-mono text-xs text-amber-200">{month}</p>
              <div className="mt-2 flex flex-col gap-2">
                {dots.filter((dot) => dot.month === month).map((dot) => (
                  <button
                    key={`${month}-${dot.label}`}
                    type="button"
                    className="rounded-full border border-amber-300/50 px-3 py-1 text-left text-xs text-amber-50"
                    onClick={() => dot.ev[0] && onOpen(dot.ev[0], dot.quote)}
                  >
                    {dot.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export type { SpineKind };
export default CaseTimeline;

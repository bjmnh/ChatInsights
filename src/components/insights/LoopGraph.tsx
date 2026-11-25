import React, { useMemo } from 'react';
import type { CaseFile } from '../../lib/insights/merge';
import { loopGraph } from '../../lib/insights/timeline';

const FILL = { open: '#f5d58a', recurring: '#7dd3fc', resolved: '#6ee7b7' };

const LoopGraph: React.FC<{
  caseFile: CaseFile;
  onOpen: (id: string, quote: string | null) => void;
}> = ({ caseFile, onOpen }) => {
  const graph = useMemo(() => loopGraph(caseFile), [caseFile]);
  if (!graph.nodes.length) return null;
  const width = Math.max(360, graph.months.length * 160);
  const rows = new Map<string, number>();
  const placed = graph.nodes.map((node) => {
    const key = node.month;
    const row = rows.get(key) ?? 0;
    rows.set(key, row + 1);
    const column = Math.max(0, graph.months.indexOf(node.month));
    return { node, x: 80 + column * 150, y: 48 + row * 56 };
  });
  const height = 80 + Math.max(...placed.map((item) => item.y));
  return (
    <section className="mb-12" data-testid="loop-graph">
      <h2 className="font-display text-3xl text-white">Open loops</h2>
      <p className="mt-2 text-sm text-gray-300">Worries, unfinished projects, and open questions. Gold is still open, blue recurs across months, green was taken up in a decision.</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label="Open loops across months">
        {graph.months.map((month, index) => (
          <text key={month} x={80 + index * 150} y={24} fill="#e7d3a1" fontSize="12">{month}</text>
        ))}
        {placed.map(({ node, x, y }) => (
          <g key={node.id} onClick={() => node.ev[0] && onOpen(node.ev[0], node.quote)} className="cursor-pointer">
            <circle cx={x} cy={y} r={16} fill={FILL[node.status]} />
            <text x={x + 22} y={y + 4} fill="#f8fafc" fontSize="12">{node.kind}: {node.label.slice(0, 42)}</text>
          </g>
        ))}
      </svg>
    </section>
  );
};

export default LoopGraph;

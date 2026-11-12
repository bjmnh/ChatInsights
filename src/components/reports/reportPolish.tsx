export function EvidenceChips({ labels }: { labels: string[] }) {
  const items = labels.map((label) => label.trim()).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((label) => (
        <span
          key={label}
          className="rounded-sm border border-current/40 bg-black/20 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function ConfidenceMeter({ value, tone = 'light' }: { value: number; tone?: 'light' | 'dark' }) {
  const width = Math.max(0, Math.min(100, Math.round(value * 100)));
  const bar = tone === 'dark' ? 'bg-amber-700' : 'bg-orange-400';
  const track = tone === 'dark' ? 'bg-amber-200/80' : 'bg-slate-800';
  const ink = tone === 'dark' ? 'text-amber-900' : 'text-slate-300';
  return (
    <div className="mt-2">
      <div className={`mb-1 flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] ${ink}`}>
        <span>Confidence</span>
        <span>{width}%</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${track}`} role="meter" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function StatBlocks({ stats }: { stats: Array<{ label: string; value: string }> }) {
  if (!stats.length) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-orange-400/30 bg-slate-950/40 px-3 py-3">
          <div className="text-2xl font-semibold text-white">{stat.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-orange-300">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function MeterRows({ meters }: { meters: Array<{ label: string; value: number }> }) {
  if (!meters.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {meters.map((meter) => {
        const width = Math.max(0, Math.min(100, Math.round(meter.value * 100)));
        return (
          <div key={meter.label}>
            <div className="mb-1 flex justify-between text-xs text-slate-300">
              <span>{meter.label}</span>
              <span>{width}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

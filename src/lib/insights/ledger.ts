export interface LedgerRun {
  label: string;
  estimateTokens: number;
  estimateDollars: number;
  spentTokens: number;
  spentDollars: number;
}

export interface CostLedger {
  estimateTokens: number;
  estimateDollars: number;
  spentTokens: number;
  spentDollars: number;
  /** One entry per read, including an update that only sent new chats. */
  runs?: LedgerRun[];
}

export const COST_NOT_RECORDED = 'Cost not recorded';

const LEDGER_KEYS = ['estimateTokens', 'estimateDollars', 'spentTokens', 'spentDollars'] as const;

function snapshot(ledger: CostLedger, label: string): LedgerRun {
  return {
    label,
    estimateTokens: ledger.estimateTokens,
    estimateDollars: ledger.estimateDollars,
    spentTokens: ledger.spentTokens,
    spentDollars: ledger.spentDollars,
  };
}

/** Fold a retry's spend into the original estimate. The estimate stays the pre-run figure. */
export function combineLedgers(base?: CostLedger, extra?: CostLedger): CostLedger | undefined {
  if (!base && !extra) return undefined;
  const runs = [
    ...(base?.runs?.length ? base.runs : base ? [snapshot(base, 'Earlier read')] : []),
    ...(extra ? [snapshot(extra, 'This read')] : []),
  ];
  return {
    estimateTokens: base?.estimateTokens || extra?.estimateTokens || 0,
    estimateDollars: base?.estimateDollars || extra?.estimateDollars || 0,
    spentTokens: (base?.spentTokens ?? 0) + (extra?.spentTokens ?? 0),
    spentDollars: (base?.spentDollars ?? 0) + (extra?.spentDollars ?? 0),
    runs,
  };
}

export function ledgerStoresSecret(ledger: CostLedger): boolean {
  for (const [key, value] of Object.entries(ledger)) {
    if (key === 'runs') {
      if (!Array.isArray(value)) return true;
      for (const run of value) {
        if (!run || typeof run !== 'object') return true;
        for (const [runKey, runValue] of Object.entries(run)) {
          if (runKey === 'label') {
            if (typeof runValue !== 'string') return true;
            continue;
          }
          if (!LEDGER_KEYS.includes(runKey as (typeof LEDGER_KEYS)[number]) || typeof runValue !== 'number') return true;
        }
      }
      continue;
    }
    if (!LEDGER_KEYS.includes(key as (typeof LEDGER_KEYS)[number]) || typeof value !== 'number') return true;
  }
  return false;
}

/** What a saved row should say. Files from before the ledger existed say so. */
export function savedCostLabel(file: { ledger?: CostLedger | null } | null | undefined): string {
  const ledger = file?.ledger;
  if (!ledger || typeof ledger.spentTokens !== 'number' || typeof ledger.estimateTokens !== 'number') return COST_NOT_RECORDED;
  return ledgerLine(ledger);
}

function money(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value < 0.01) return '< $0.01';
  return `$${value.toFixed(2)}`;
}

function tokens(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString()} tokens`;
}

export function ledgerLine(ledger: CostLedger): string {
  return `Estimate ${money(ledger.estimateDollars)} (${tokens(ledger.estimateTokens)}) · Actual ${money(ledger.spentDollars)} (${tokens(ledger.spentTokens)})`;
}

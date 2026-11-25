export interface CostLedger {
  estimateTokens: number;
  estimateDollars: number;
  spentTokens: number;
  spentDollars: number;
}

const LEDGER_KEYS = ['estimateTokens', 'estimateDollars', 'spentTokens', 'spentDollars'] as const;

/** Fold a retry's spend into the original estimate. The estimate stays the pre-run figure. */
export function combineLedgers(base?: CostLedger, extra?: CostLedger): CostLedger | undefined {
  if (!base && !extra) return undefined;
  return {
    estimateTokens: base?.estimateTokens || extra?.estimateTokens || 0,
    estimateDollars: base?.estimateDollars || extra?.estimateDollars || 0,
    spentTokens: (base?.spentTokens ?? 0) + (extra?.spentTokens ?? 0),
    spentDollars: (base?.spentDollars ?? 0) + (extra?.spentDollars ?? 0),
  };
}

export function ledgerStoresSecret(ledger: CostLedger): boolean {
  const keys = Object.keys(ledger);
  if (keys.some((key) => !LEDGER_KEYS.includes(key as (typeof LEDGER_KEYS)[number]))) return true;
  return Object.values(ledger).some((value) => typeof value !== 'number');
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

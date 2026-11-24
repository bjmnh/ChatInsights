import type { Coverage } from './merge.ts';
import { PROVIDER_AUTH_MESSAGE } from './transport.ts';

export { PROVIDER_AUTH_MESSAGE };

const REJECTION = /rejected|invalid api key|api key not valid|unauthorized/i;
const SOFT_REJECTION = /zero-retention|pass-through|fall back|fallback/i;

export interface KeyTestSnapshot {
  ok: boolean;
  message: string;
  secret: string;
  providerId: string;
}

/** Block a read that would reuse the key Test key just rejected. A different key, or a soft browser-only rejection, can still start. */
export function rejectedKeyBlock(check: KeyTestSnapshot | null, providerId: string, secret: string): string | null {
  if (!check || check.ok) return null;
  if (!secret || check.secret !== secret || check.providerId !== providerId) return null;
  if (SOFT_REJECTION.test(check.message)) return null;
  if (!REJECTION.test(check.message)) return null;
  return 'That key was rejected. Check the key before starting the read.';
}

/** Save an account key only after Test key succeeded for this secret, or after the read's provider call succeeded. */
export function maySaveAccountKey(input: { optedIn: boolean; typedSecret: string; testedOk: boolean; runSucceeded: boolean }): boolean {
  if (!input.optedIn || !input.typedSecret.trim()) return false;
  return input.testedOk || input.runSucceeded;
}

/** An auth rejection is not a case file. Everything else, including a partial budget stop, can be kept locally. */
export function shouldSaveLocalRun(coverage: Pick<Coverage, 'partialReason' | 'read' | 'planned' | 'failed'>): boolean {
  const reason = coverage.partialReason ?? '';
  if (reason === 'auth' || /api key was rejected/i.test(reason)) return false;
  if (coverage.planned > 0 && coverage.read === 0 && coverage.failed >= coverage.planned && /auth|api key/i.test(reason)) return false;
  return true;
}

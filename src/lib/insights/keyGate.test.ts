import { describe, expect, it } from 'vitest';
import { PROVIDER_AUTH_MESSAGE, rejectedKeyBlock, shouldSaveLocalRun } from './keyGate';

describe('rejected keys', () => {
  const rejected = {
    ok: false,
    message: 'That key was rejected.',
    secret: 'bad-key',
    providerId: 'gemini',
  };

  it('blocks the key that just failed and allows a different one', () => {
    expect(rejectedKeyBlock(rejected, 'gemini', 'bad-key')).toMatch(/rejected/);
    expect(rejectedKeyBlock(rejected, 'gemini', 'new-key')).toBeNull();
    expect(rejectedKeyBlock({ ...rejected, ok: true, message: 'Key works.' }, 'gemini', 'bad-key')).toBeNull();
    expect(rejectedKeyBlock(null, 'gemini', 'bad-key')).toBeNull();
  });

  it('does not block a browser-only rejection that can fall back to the pass-through', () => {
    expect(rejectedKeyBlock({
      ok: false,
      message: 'That key was rejected. A zero-retention org may be blocking browser calls; the read can fall back to the pass-through.',
      secret: 'ant',
      providerId: 'anthropic',
    }, 'anthropic', 'ant')).toBeNull();
  });

  it('does not keep an auth rejection as a report', () => {
    expect(shouldSaveLocalRun({ partialReason: 'budget', read: 1, planned: 3, failed: 0 })).toBe(true);
    expect(shouldSaveLocalRun({ partialReason: 'batch-failed', read: 1, planned: 3, failed: 1 })).toBe(true);
    expect(shouldSaveLocalRun({ partialReason: PROVIDER_AUTH_MESSAGE, read: 0, planned: 3, failed: 3 })).toBe(false);
    expect(shouldSaveLocalRun({ partialReason: 'auth', read: 0, planned: 3, failed: 3 })).toBe(false);
  });
});

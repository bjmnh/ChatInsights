import { describe, expect, it } from 'vitest';
import { noticesAfter, type PerReadNotices } from './readSession.ts';

const stale: PerReadNotices = {
  retryNote: 'Tried the unread conversations again (1 call).',
  runError: 'The provider was busy (503).',
  saveMessage: 'Saved as a partial report.',
};

describe('per-read notices', () => {
  it('drops a retry note when a new file, a new read, or start over begins', () => {
    for (const action of ['start-over', 'new-file', 'new-read'] as const) {
      expect(noticesAfter(action, stale)).toEqual({ retryNote: '', runError: '', saveMessage: '' });
    }
  });

  it('keeps a note only for the read that produced it', () => {
    const noted = noticesAfter('retry-note', { retryNote: '', runError: 'old', saveMessage: 'old' }, stale.retryNote);
    expect(noted.retryNote).toBe(stale.retryNote);
    expect(noticesAfter('new-read', noted).retryNote).toBe('');
  });
});

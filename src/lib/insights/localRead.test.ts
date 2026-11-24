/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { canShowCheckpoint, shouldClearLocalRead } from './localRead';
import { notifyLocalReadCleared, subscribeLocalReadCleared } from './browserStore';

describe('local read ownership', () => {
  it('clears on sign-out and account switch, and keeps an anonymous read across sign-up', () => {
    expect(shouldClearLocalRead('user-a', null, 'SIGNED_OUT')).toBe(true);
    expect(shouldClearLocalRead('user-a', 'user-b', 'SIGNED_IN')).toBe(true);
    expect(shouldClearLocalRead(null, 'user-b', 'SIGNED_IN')).toBe(false);
    expect(shouldClearLocalRead('user-a', 'user-a', 'TOKEN_REFRESHED')).toBe(false);
    expect(shouldClearLocalRead('user-a', null, 'STORAGE')).toBe(false);
  });

  it('hides another account’s checkpoint and still shows an anonymous one', () => {
    const owned = { ownerId: 'user-a', caseFile: { id: 1 }, conversations: [{ id: 'c1' }] };
    const anonymous = { ownerId: null, caseFile: { id: 2 }, conversations: [{ id: 'c1' }] };
    expect(canShowCheckpoint(owned, 'user-a')).toBe(true);
    expect(canShowCheckpoint(owned, 'user-b')).toBe(false);
    expect(canShowCheckpoint(owned, null)).toBe(false);
    expect(canShowCheckpoint(anonymous, null)).toBe(true);
    expect(canShowCheckpoint(anonymous, 'user-new')).toBe(true);
    expect(canShowCheckpoint({ ownerId: 'user-a' }, 'user-a')).toBe(false);
  });

  it('tells open pages to drop the in-memory read', () => {
    const listener = vi.fn();
    const stop = subscribeLocalReadCleared(listener);
    notifyLocalReadCleared();
    stop();
    notifyLocalReadCleared();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

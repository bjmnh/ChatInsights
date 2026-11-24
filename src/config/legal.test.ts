import { describe, expect, it } from 'vitest';
import { LEGAL_LAST_UPDATED } from './legal';

describe('legal pages', () => {
  it('shows today’s last-updated date', () => {
    expect(LEGAL_LAST_UPDATED).toBe('November 24, 2026');
  });
});

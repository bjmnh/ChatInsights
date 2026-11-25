import { describe, expect, it } from 'vitest';
import type { NormalizedConversation } from '../conversationParser/types.ts';
import { sourceChips } from './hydratePremium.ts';
import { journalEntries } from './journal.ts';
import { combineLedgers, ledgerLine, ledgerStoresSecret } from './ledger.ts';
import { localReportView } from './localReport.ts';
import { runLocalPass } from './localPass.ts';
import { mergeCaseFiles } from './merge.ts';
import { attachResult, locateQuote } from './receipts.ts';
import { exportFingerprint } from './saveReport.ts';
import { runRead } from './runner.ts';

function convo(id: string, text: string): NormalizedConversation {
  return {
    id,
    title: id,
    createdAt: '2025-06-01T15:00:00.000Z',
    sourceFormat: 'chatgpt',
    messages: [
      { role: 'user', text, timestamp: '2025-06-01T15:00:00.000Z' },
      { role: 'assistant', text: 'Noted.', timestamp: '2025-06-01T15:01:00.000Z' },
    ],
  };
}

describe('click-through receipts', () => {
  it('finds a quote exactly, through messy whitespace, and by a fuzzy word overlap', () => {
    const messages = [
      { text: 'Nothing here.' },
      { text: 'We should keep renting for another year.' },
      { text: 'We\nshould   keep renting\nfor another year, Dana.' },
    ];
    expect(locateQuote(messages, 'keep renting for another year')).toMatchObject({ messageIndex: 1, start: 10 });
    expect(locateQuote([{ text: 'We should keep renting for another year.' }], 'keep   renting\nfor another year')?.messageIndex).toBe(0);
    const fuzzy = locateQuote(
      [{ text: 'unrelated' }, { text: 'We should keep renting for another year after the move.' }],
      'should keep renting for another year please',
    );
    expect(fuzzy?.messageIndex).toBe(1);
    expect(locateQuote(messages, 'no such sentence exists here at all')).toBeNull();
  });

  it('matches a re-attached export by fingerprint and keeps the conversation id on the chip', async () => {
    const conversations = [convo('c1', 'My sister Dana wrote about the rent.')];
    const fingerprint = await exportFingerprint(conversations);
    expect(attachResult(fingerprint, fingerprint)).toBe('match');
    expect(attachResult('other', fingerprint)).toBe('mismatch');
    expect(attachResult(fingerprint, '')).toBe('missing');
    expect(sourceChips(['c1'], new Map([['c1', 'Rent']]), new Map([['c1', 0]]))).toEqual([
      { id: 'c1', label: 'Conversation 1 · Rent' },
    ]);
  });
});

describe('local report', () => {
  it('summarizes people, reasons, hours, exposure, and usage without the raw address', () => {
    const report = runLocalPass([convo('c1', 'My sister Dana and I should keep renting. My knee hurts. Email me at dana@example.com')]);
    const view = localReportView(report);
    expect(view.hours).toHaveLength(24);
    expect(view.weekdays).toHaveLength(7);
    expect(view.hours[15]).toBeGreaterThan(0);
    expect(view.reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining(['money', 'health']));
    expect(view.exposure.emails).toBe(1);
    expect(view.byMonth).toEqual([{ month: '2025-06', count: 1 }]);
    expect(view.providers).toEqual([{ name: 'chatgpt', count: 1 }]);
    expect(view.flagged).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toContain('dana@example.com');
  });
});

describe('decision journal', () => {
  it('lists a reversal and a contradiction with their evidence', () => {
    const entries = journalEntries({
      decisions: [{
        v: 'keep renting',
        question: 'Rent or buy?',
        conf: 0.5,
        ev: ['c1'],
        src: 'ai',
        first: '2025-01',
        last: '2025-06',
        quote: 'we should keep renting',
        reversed: { v: 'buy a place', date: '2025-06', ev: ['c2'] },
      }],
      contradictions: [{
        field: 'location',
        earlier: { v: 'Austin', conf: 0.4, ev: ['c3'], src: 'ai', first: '2024-01', last: '2024-01', quote: null },
        later: { v: 'Phoenix', conf: 0.6, ev: ['c4'], src: 'ai', first: '2025-03', last: '2025-03', quote: 'I live in the Phoenix area' },
      }],
    });
    expect(entries.map((entry) => entry.kind)).toEqual(['contradiction', 'reversal']);
    expect(entries.find((entry) => entry.kind === 'reversal')?.earlier).toBe('buy a place');
    expect(entries.find((entry) => entry.kind === 'reversal')?.ev).toEqual(['c1', 'c2']);
    expect(entries.find((entry) => entry.kind === 'contradiction')?.body).toBe('Phoenix');
  });
});

describe('cost ledger', () => {
  it('stores the estimate beside the actual spend and adds a retry without keeping a key', async () => {
    const conversations = [convo('c1', 'My sister Dana wrote about the rent.')];
    const local = runLocalPass(conversations);
    const secret = 'sk-this-must-not-land-in-the-case-file';
    const result = await runRead({
      conversations,
      local,
      depth: 'quick',
      quickFraction: 1,
      estimate: { tokens: 1200, dollars: 0.42 },
      model: { provider: 'script', id: 'script', inputPricePerMillion: 1_000_000, outputPricePerMillion: 2_000_000, contextWindow: 100_000 },
      adapter: {
        id: 'script',
        async complete(request: { schemaName?: string; user: string }) {
          if (request.schemaName === 'narrative') {
            return {
              text: JSON.stringify({ cover: 'You keep coming back to the rent.', codename: 'Second Draft', codename_reason: 'You rewrite the rent note until it sounds like you.', archetype: 'The person who rewrites the note' }),
              viaProxy: false,
              usage: { input: 10, output: 5 },
            };
          }
          const ids = [...request.user.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
          return {
            text: JSON.stringify({ convs: ids.map((id) => ({ c: id, topic: 'rent' })), facts: [] }),
            viaProxy: false,
            usage: { input: 100, output: 20 },
          };
        },
      },
      sleep: async () => undefined,
    });
    expect(result.ledger).toMatchObject({ estimateTokens: 1200, estimateDollars: 0.42, spentTokens: 135 });
    expect(result.ledger!.spentDollars).toBeGreaterThan(0);
    expect(ledgerStoresSecret(result.ledger!)).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(ledgerLine(result.ledger!)).toMatch(/Estimate/);
    expect(ledgerLine(result.ledger!)).toMatch(/Actual/);
    const merged = mergeCaseFiles(result, {
      ...result,
      ledger: { estimateTokens: 9, estimateDollars: 9, spentTokens: 7, spentDollars: 0.1 },
    });
    expect(merged.ledger?.estimateTokens).toBe(1200);
    expect(merged.ledger?.estimateDollars).toBe(0.42);
    expect(merged.ledger?.spentTokens).toBe(142);
    expect(combineLedgers(undefined, undefined)).toBeUndefined();
  });
});

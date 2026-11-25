import { describe, expect, it } from 'vitest';
import type { NormalizedConversation } from '../conversationParser/types.ts';
import { journalEntries } from './journal.ts';
import { COST_NOT_RECORDED, combineLedgers, savedCostLabel } from './ledger.ts';
import { caseDiff, conversationDelta, matchSavedCase, stampsFrom, stripChangedFacts } from './livingCase.ts';
import type { CaseFile } from './merge.ts';
import { combineExports, providerPortraits } from './providerPortrait.ts';
import { runLocalPass } from './localPass.ts';
import { caseMarkdown, shareCardHtml } from './shareExport.ts';
import { readStoredCaseFile } from '../../services/caseFileService.ts';

function chat(id: string, text: string, source: NormalizedConversation['sourceFormat'] = 'chatgpt', at = '2025-06-01T00:00:00.000Z'): NormalizedConversation {
  return {
    id,
    title: id,
    createdAt: at,
    sourceFormat: source,
    messages: [
      { role: 'user', text, timestamp: at },
      { role: 'assistant', text: 'Noted.', timestamp: at },
    ],
  };
}

function file(partial: Partial<CaseFile>): CaseFile {
  return {
    schema_version: '1.0',
    model: { provider: 'xai', id: 'grok-4.3', depth: 'deep' },
    coverage: {
      conversations: 2, planned: 2, read: 2, skipped: 0, batches: 1, failed: 0, depth: 'deep', partial: false,
      narrative: 'written', viaProxy: false, dateRange: { first: null, last: null }, topics: [{ c: 'c1', topic: 'rent' }],
    },
    subject: {},
    people: [],
    places: [],
    orgs: [],
    timeline: [],
    projects: [],
    routines: { hours: [], weekdays: [], peakHours: [], lateNightShare: 0, longestStreak: 0 },
    interests: [],
    beliefs: [],
    worries: [],
    health: [],
    money: [],
    decisions: [],
    open_loops: [],
    contradictions: [],
    exposure: { emails: [], phones: [], cardLike: 0, urls: 0, keyLike: 0, ev: [] },
    style: { wordsPerMessage: 12, vocabulary: 0.4, questionShare: 0.2, swearCount: 0, topPhrases: [], userMessages: 2, userWords: 24 },
    usage: { providers: [], byMonth: [], longest: [] },
    notable: [],
    narrative: { cover: 'A cover.', blurbs: {}, ev: [], codename: 'Second Draft', codename_reason: 'A name.', archetype: 'A reader' },
    cardStatus: {} as CaseFile['cardStatus'],
    ...partial,
  };
}

describe('saved rows from before the ledger', () => {
  it('reads the ledger out of the stored case file and says when it was never recorded', () => {
    const stored = JSON.stringify(file({
      ledger: { estimateTokens: 1000, estimateDollars: 0.4, spentTokens: 800, spentDollars: 0.2 },
      decisions: [{ v: 'keep renting', question: 'Rent or buy?', conf: 0.5, ev: ['c1'], src: 'ai', first: null, last: null, quote: 'keep renting', reversed: null }],
    }));
    const parsed = readStoredCaseFile(stored);
    expect(parsed?.ledger?.spentTokens).toBe(800);
    expect(parsed?.decisions).toHaveLength(1);
    expect(savedCostLabel(parsed)).toMatch(/Estimate/);
    expect(savedCostLabel(parsed)).toMatch(/Actual/);
    expect(savedCostLabel(file({}))).toBe(COST_NOT_RECORDED);
    expect(savedCostLabel(null)).toBe(COST_NOT_RECORDED);
  });

  it('builds a journal from an older decision shape', () => {
    const entries = journalEntries({
      decisions: [
        { v: 'keep renting', question: 'Rent or buy?', quote: 'keep renting' },
        { text: 'stay at the job', reversed: 'leave' },
      ],
      contradictions: [{ field: 'location', earlier: 'Austin', later: { v: 'Phoenix', ev: ['c4'], quote: 'Phoenix area' } }],
    });
    expect(entries.map((entry) => entry.kind).sort()).toEqual(['contradiction', 'decision', 'reversal']);
    expect(entries.find((entry) => entry.kind === 'reversal')?.earlier).toBe('leave');
    expect(journalEntries({})).toEqual([]);
  });
});

describe('living case file', () => {
  it('reads only new and changed chats and cites what changed', () => {
    const previous = stampsFrom([
      chat('c1', 'My sister Dana wrote about the rent.'),
      chat('c2', 'We should keep renting.'),
    ]);
    const next = [
      chat('c1', 'My sister Dana wrote about the rent. And a second note.'),
      chat('c2', 'We should keep renting.'),
      chat('c3', 'A new project called Northwind.'),
    ];
    next[0].messages.push({ role: 'user', text: 'One more line.', timestamp: '2025-07-01T00:00:00.000Z' });
    const delta = conversationDelta(previous, next);
    expect(delta.changed).toEqual(['c1']);
    expect(delta.unchanged).toEqual(['c2']);
    expect(delta.added).toEqual(['c3']);
    expect(delta.dropped).toEqual([]);
    const before = file({
      people: [{ id: 'p1', name: 'Dana', relationship: 'sister', mentions: 1, v: 'Dana', conf: 0.5, ev: ['c1'], src: 'ai', first: null, last: null, quote: null }],
      coverage: { ...file({}).coverage, topics: [{ c: 'c1', topic: 'family' }, { c: 'c2', topic: 'rent' }] },
    });
    expect(matchSavedCase(stampsFrom(next), 'different', { fingerprint: 'old', file: before })).toBe('ids');
    const stripped = stripChangedFacts(before, ['c1']);
    expect(stripped.people).toHaveLength(0);
    const after = file({
      people: [{ id: 'p2', name: 'North', relationship: null, mentions: 1, v: 'North', conf: 0.4, ev: ['c3'], src: 'ai', first: null, last: null, quote: null }],
      projects: [{ v: 'Northwind', conf: 0.4, ev: ['c3'], src: 'ai', first: null, last: null, quote: null }],
      worries: [{ v: 'the launch', conf: 0.4, ev: ['c3'], src: 'ai', first: null, last: null, quote: null }],
      decisions: [{ v: 'keep renting', question: 'Rent or buy?', conf: 0.5, ev: ['c2'], src: 'ai', first: null, last: null, quote: null, reversed: { v: 'buy', date: '2025-07', ev: ['c1'] } }],
      open_loops: [{ v: 'When to move', conf: 0.3, ev: ['c3'], src: 'ai', first: null, last: null, quote: null }],
    });
    const diff = caseDiff(before, after, delta);
    expect(diff.peopleAdded.map((item) => item.label)).toEqual(['North']);
    expect(diff.peopleDropped.map((item) => item.label)).toEqual(['Dana']);
    expect(diff.projectsAdded[0].ev).toEqual(['c3']);
    expect(diff.loopsAdded[0].label).toMatch(/move/);
    expect(diff.reversals[0].detail).toBe('keep renting');
    expect(diff.worriesShifted[0].label).toMatch(/launch/);
  });
});

describe('multi-export life file', () => {
  it('keeps each provider and compares volume and topics', () => {
    const combined = combineExports([
      [chat('a', 'Hello from ChatGPT', 'chatgpt')],
      [chat('a', 'Hello from ChatGPT with more', 'chatgpt'), chat('b', 'Hello from Claude?', 'claude')],
    ]);
    expect(combined.map((item) => item.sourceFormat).sort()).toEqual(['chatgpt', 'claude']);
    expect(combined.find((item) => item.id === 'a')?.messages.length).toBe(2);
    const local = runLocalPass(combined);
    const portraits = providerPortraits(local, [{ c: 'b', topic: 'greeting' }]);
    expect(portraits.map((item) => item.provider).sort()).toEqual(['chatgpt', 'claude']);
    expect(portraits.find((item) => item.provider === 'claude')?.topics[0]).toEqual({ topic: 'greeting', ev: ['b'] });
  });
});

describe('redacted share and markdown', () => {
  it('leaves names, quotes, and addresses off the share card and footnotes the chat title', () => {
    const base = file({
      people: [{ id: 'p1', name: 'Dana', relationship: 'sister', mentions: 1, v: 'Dana', conf: 0.5, ev: ['c1'], src: 'ai', first: null, last: null, quote: 'my sister Dana' }],
      exposure: { emails: ['dana@example.com'], phones: [], cardLike: 0, urls: 0, keyLike: 0, ev: ['c1'] },
    });
    const html = shareCardHtml(base);
    expect(html).toContain('Second Draft');
    expect(html).not.toContain('Dana');
    expect(html).not.toContain('dana@example.com');
    expect(html).not.toContain('my sister Dana');
    const markdown = caseMarkdown(base, new Map([['c1', { title: 'Family trip', date: '2025-02-02T00:00:00.000Z' }]]));
    expect(markdown).toContain('[^1]');
    expect(markdown).toContain('Family trip');
    expect(markdown).toContain('02 Feb 2025');
    expect(markdown).not.toContain('sk-');
  });
});

describe('ledger runs', () => {
  it('keeps each run instead of replacing the earlier spend', () => {
    const combined = combineLedgers(
      { estimateTokens: 1000, estimateDollars: 1, spentTokens: 800, spentDollars: 0.5 },
      { estimateTokens: 200, estimateDollars: 0.2, spentTokens: 50, spentDollars: 0.05 },
    );
    expect(combined?.spentTokens).toBe(850);
    expect(combined?.estimateTokens).toBe(1000);
    expect(combined?.runs?.map((run) => run.spentTokens)).toEqual([800, 50]);
  });
});

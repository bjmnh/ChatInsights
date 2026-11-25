import { describe, expect, it } from 'vitest';
import type { NormalizedConversation } from '../conversationParser/types.ts';
import { askCaseFile, askUserPayload, compactFacts, NOT_IN_CASE_FILE, rememberQuestions, retrieveChats } from './askCase.ts';
import type { CaseFile } from './merge.ts';
import { schemaFor } from './schema.ts';
import { loopGraph, monthSpine } from './timeline.ts';

function chat(id: string, text: string): NormalizedConversation {
  return {
    id,
    title: id,
    createdAt: '2025-06-01T00:00:00.000Z',
    sourceFormat: 'chatgpt',
    messages: [{ role: 'user', text, timestamp: '2025-06-01T00:00:00.000Z' }],
  };
}

function file(partial: Partial<CaseFile> = {}): CaseFile {
  return {
    schema_version: '1.0',
    model: { provider: 'xai', id: 'grok-4.3', depth: 'deep' },
    coverage: {
      conversations: 1, planned: 1, read: 1, skipped: 0, batches: 1, failed: 0, depth: 'deep', partial: false,
      narrative: 'written', viaProxy: false, dateRange: { first: null, last: null }, topics: [],
    },
    subject: {},
    people: [{ id: 'p1', name: 'Dana', relationship: 'sister', mentions: 1, v: 'Dana', conf: 0.5, ev: ['c1'], src: 'ai', first: '2024-02-01', last: '2024-05-01', quote: 'my sister Dana' }],
    places: [],
    orgs: [],
    timeline: [],
    projects: [{ v: 'Northwind', conf: 0.4, ev: ['c2'], src: 'ai', first: '2025-03-01', last: '2025-03-01', quote: null }],
    routines: { hours: [], weekdays: [], peakHours: [], lateNightShare: 0, longestStreak: 0 },
    interests: [],
    beliefs: [],
    worries: [{ v: 'the launch deadline', conf: 0.4, ev: ['c3'], src: 'ai', first: '2025-01-01', last: '2025-04-01', quote: 'launch deadline' }],
    health: [],
    money: [],
    decisions: [],
    open_loops: [{ v: 'When to move', conf: 0.3, ev: ['c4'], src: 'ai', first: '2025-06-01', last: null, quote: null }],
    contradictions: [],
    exposure: { emails: [], phones: [], cardLike: 0, urls: 0, keyLike: 0, ev: [] },
    style: { wordsPerMessage: 10, vocabulary: 0.5, questionShare: 0.1, swearCount: 0, topPhrases: [], userMessages: 1, userWords: 10 },
    usage: { providers: [], byMonth: [], longest: [] },
    notable: [],
    narrative: { cover: 'A cover.', blurbs: {}, ev: [], codename: 'Second Draft', codename_reason: 'A name.', archetype: 'A reader' },
    cardStatus: {} as CaseFile['cardStatus'],
    ledger: { estimateTokens: 100, estimateDollars: 1, spentTokens: 80, spentDollars: 0.4 },
    ...partial,
  };
}

describe('ask the case file', () => {
  it('answers only from cited facts and refuses to guess', async () => {
    const base = file();
    const facts = compactFacts(base);
    expect(askUserPayload(facts, 'Who is Dana?')).not.toContain('<conversation');
    expect(retrieveChats([chat('c1', 'My sister Dana wrote about the rent.'), chat('c9', 'Unrelated weather')], 'Who is Dana?')).toContain('id="c1"');
    let calls = 0;
    const supported = await askCaseFile({
      file: base,
      question: 'Who is Dana?',
      prices: { input: 1_000_000, output: 1_000_000 },
      complete: async () => {
        calls += 1;
        return { text: JSON.stringify({ supported: true, answer: 'Dana is your sister.', factIds: [facts[0].n] }), viaProxy: false, usage: { input: 20, output: 10 } };
      },
    });
    expect(supported.turn.answer).toBe('Dana is your sister.');
    expect(supported.turn.ev[0]).toEqual({ id: 'c1', quote: 'my sister Dana' });
    expect(supported.ledger?.spentTokens).toBe(110);
    expect(supported.ledger?.runs?.at(-1)?.label).toBe('Question');
    const refused = await askCaseFile({
      file: base,
      question: 'What is the bank password?',
      prices: { input: 0, output: 0 },
      complete: async () => ({ text: JSON.stringify({ supported: false, answer: 'It is hunter2.', factIds: [] }), viaProxy: false }),
    });
    expect(refused.turn.answer).toBe(NOT_IN_CASE_FILE);
    expect(refused.turn.ev).toEqual([]);
    const blocked = await askCaseFile({
      file: base,
      question: 'Who is Dana?',
      prices: { input: 1, output: 1 },
      budget: { maxTokens: 90 },
      complete: async () => {
        calls += 1;
        return { text: '{}', viaProxy: false };
      },
    });
    expect(blocked.called).toBe(false);
    expect(blocked.blocked).toMatch(/token cap/);
    expect(calls).toBe(1);
    const history = rememberQuestions([], supported.turn);
    expect(JSON.stringify(history)).not.toMatch(/apiKey|sk-/);
    expect(schemaFor('ask')).toMatchObject({ required: ['supported', 'answer', 'factIds'] });
  });
});

describe('timelines and open loops', () => {
  it('places a person on the months they were cited and opens from those chats', () => {
    const dots = monthSpine(file(), 'person', 'Dana');
    expect(dots.map((dot) => dot.month)).toEqual(['2024-02', '2024-05']);
    expect(dots[0].ev).toEqual(['c1']);
    expect(dots[0].quote).toBe('my sister Dana');
  });

  it('marks a recurring worry, an open loop, and a project a decision settled', () => {
    const graph = loopGraph(file({
      decisions: [{ v: 'shipped Northwind', question: 'Launch?', conf: 0.5, ev: ['c2'], src: 'ai', first: '2025-08-01', last: null, quote: null, reversed: null }],
    }));
    expect(graph.nodes.find((node) => node.kind === 'worry')?.status).toBe('recurring');
    expect(graph.nodes.find((node) => node.kind === 'loop')?.status).toBe('open');
    expect(graph.nodes.find((node) => node.label === 'Northwind')?.status).toBe('resolved');
    expect(graph.months[0] < graph.months[1]).toBe(true);
  });
});

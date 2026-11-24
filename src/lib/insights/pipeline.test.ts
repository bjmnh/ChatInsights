import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './csp.ts';
import { donationHref } from './donation.ts';
import { cardStates, selectConversations, batchSizeFor } from './depth.ts';
import { estimateRead, estimateWorkedExample, formatCost, formatMinutes } from './estimate.ts';
import { isEchoedPlaceholder } from './checks.ts';
import { notablePhraseOk, runLocalPass } from './localPass.ts';
import { caseFileNumber } from './caseNumber.ts';
import { cardPreviews, caseDownloadName, conversationTitle, displayTitle, EMPTY_IN_CHATS, hydratePremiumReport, isThinProfileLabel, publicSubjectName, reportSubtitle, scrubRawCodes, sentenceCase, sourceLabels, toHashtag, uniqueDisplay, vocabularyMeterValue } from './hydratePremium.ts';
import { buildCaseFile, computeConfidence, decisionText, displayBadge, isComplete, mergeCaseFiles, NEUTRAL_CODENAME, normalizeTitleCase, plainPartialDetail, publicCodenameReason, reportLabel, reportStatus, savedModelLabel, settleArchetype, settleCodename, WRITE_UP_MISSING, type CaseFile } from './merge.ts';
import { maskSensitive, packBatches, packConversation } from './pack.ts';
import { EXTRACTION_SYSTEM } from './prompts.ts';
import { isPrivateHost, isProxyCandidate } from './proxyPolicy.ts';
import { createRateLimiter, handleProxyRequest } from './proxyHandler.ts';
import {
  buildRepairPrompt,
  parseBatchPayload,
  toGeminiSchema,
} from './schema.ts';
import { buildSampleConversations, createDemoAdapter } from './sample.ts';
import { caseFileRow, exportFingerprint, persistenceFields, upsertByConflict } from './saveReport.ts';
import { runRead, type RunProgress } from './runner.ts';
import { completeWithRetry, ProviderRequestError, PROVIDER_AUTH_MESSAGE, retryWaitMs } from './transport.ts';
import {
  DEFAULT_PBKDF2_ITERATIONS,
  forgetAllKeys,
  forgetKey,
  listKeys,
  memoryVaultStore,
  rememberKey,
  revealKey,
} from './keyVault.ts';
import { createAnthropicAdapter, createGeminiAdapter, createOpenAICompatibleAdapter, ANTHROPIC_BROWSER_HEADER } from './adapters.ts';
import type { NormalizedConversation } from '../conversationParser/types.ts';

function convo(id: string, text: string, assistant = 'Noted.'): NormalizedConversation {
  return {
    id,
    title: id,
    createdAt: '2025-01-01T00:00:00.000Z',
    sourceFormat: 'normalized',
    messages: [
      { role: 'user', text, timestamp: '2025-01-01T00:00:00.000Z' },
      { role: 'assistant', text: assistant, timestamp: '2025-01-01T00:00:01.000Z' },
    ],
  };
}

describe('depth selection', () => {
  const conversations = Array.from({ length: 10 }, (_, index) => convo(
    `c${index}`,
    index < 2 ? `My sister Dana and I talked about a diagnosis and the rent. Message ${index}` : `What is ${index} plus one?`,
  ));
  const local = runLocalPass(conversations);

  it('keeps Standard on flagged chats and Quick on the top slice', () => {
    const quick = selectConversations(local, 'quick', 0.1);
    const standard = selectConversations(local, 'standard');
    const deep = selectConversations(local, 'deep');
    expect(quick.chosenIds).toHaveLength(1);
    expect(quick.chosenIds[0]).toBe(local.conversations.slice().sort((a, b) => b.score - a.score)[0].id);
    expect(standard.chosenIds.every((id) => local.conversations.find((item) => item.id === id)?.flagged)).toBe(true);
    expect(standard.skippedIds.length).toBeGreaterThan(0);
    expect(deep.chosenIds).toHaveLength(10);
    expect(deep.skippedIds).toEqual([]);
  });

  it('marks Quick cards that the depth does not search', () => {
    const quick = cardStates('quick');
    expect(quick.timeline).toBe('not-searched');
    expect(quick.decisions).toBe('not-searched');
    expect(quick.loops).toBe('not-searched');
    expect(quick.stranger).toBe('not-searched');
    expect(quick.style).toBe('local');
    expect(quick.usage).toBe('local');
    expect(cardStates('standard').stranger).toBe('ready');
    expect(cardStates('deep').timeline).toBe('ready');
    expect(cardStates('forensic').decisions).toBe('ready');
  });

  it('shrinks batches when the context window is small', () => {
    expect(batchSizeFor('forensic', 8000, 3000)).toBe(1);
    expect(batchSizeFor('quick', 1_000_000, 1500)).toBe(50);
    expect(batchSizeFor('standard', 1_000_000, 1500)).toBe(30);
  });
});

describe('cost estimate', () => {
  const prices = {
    lite: { input: 0.3, output: 2.5 },
    luna: { input: 0.2, output: 1.2 },
    haiku: { input: 0.1, output: 0.5 },
    grok: { input: 1.25, output: 2.5 },
  };

  it('matches the worked example for the published model prices', () => {
    expect(estimateWorkedExample('quick', prices.lite).cost).toBeCloseTo(0.18, 2);
    expect(estimateWorkedExample('quick', prices.luna).cost).toBeCloseTo(0.11, 2);
    expect(estimateWorkedExample('quick', prices.haiku).cost).toBeCloseTo(0.05, 2);
    expect(estimateWorkedExample('quick', prices.grok).cost).toBeCloseTo(0.54, 2);
    expect(estimateWorkedExample('standard', prices.lite).cost).toBeCloseTo(1.06, 2);
    expect(estimateWorkedExample('deep', prices.lite).cost).toBeCloseTo(2.56, 2);
    expect(estimateWorkedExample('forensic', prices.lite).cost).toBeCloseTo(6.66, 2);
    expect(estimateWorkedExample('quick', prices.lite).calls).toBe(4);
    expect(estimateWorkedExample('standard', prices.lite).calls).toBe(28);
    expect(estimateWorkedExample('deep', prices.lite).calls).toBe(68);
    expect(estimateWorkedExample('forensic', prices.lite).calls).toBe(252);
  });

  it('prices a local model at zero and includes the cushion', () => {
    const estimate = estimateRead({
      depth: 'standard',
      conversationCount: 2,
      userTokens: 1000,
      fullTokens: 4000,
      contextWindow: 8192,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
    });
    expect(estimate.cost).toBe(0);
    expect(formatCost(estimate.cost)).toBe('$0');
    const paid = estimateRead({
      depth: 'quick',
      conversationCount: 1,
      userTokens: 1_000_000,
      fullTokens: 1_000_000,
      contextWindow: 1_000_000,
      inputPricePerMillion: 1,
      outputPricePerMillion: 0,
    });
    expect(paid.cost).toBeCloseTo(paid.costBeforeCushion * 1.2, 5);
  });

  it('scales a small export instead of using the large-file narrative allowance', () => {
    const prices = { inputPricePerMillion: 0.3, outputPricePerMillion: 2.5, contextWindow: 1_000_000, depth: 'standard' as const };
    const tiny = estimateRead({ ...prices, conversationCount: 2, userTokens: 278, fullTokens: 400 });
    const larger = estimateRead({ ...prices, conversationCount: 20, userTokens: 2780, fullTokens: 4000 });
    const pricey = estimateRead({ ...prices, conversationCount: 2, userTokens: 278, fullTokens: 400, inputPricePerMillion: 3, outputPricePerMillion: 15 });
    expect(tiny.inputTokens).toBeLessThan(5_000);
    expect(tiny.outputTokens).toBeLessThan(200);
    expect(tiny.cost).toBeLessThan(0.02);
    expect(tiny.cost).toBeLessThan(larger.cost);
    expect(pricey.cost).toBeGreaterThan(tiny.cost);
    expect(estimateRead({ ...prices, depth: 'quick', conversationCount: 2, userTokens: 278, fullTokens: 400 }).calls).toBe(1);
  });

  it('quotes a four-call quick scan as a range that covers several minutes', () => {
    const estimate = estimateRead({
      depth: 'quick',
      conversationCount: 175,
      userTokens: 150_000,
      fullTokens: 162_000,
      contextWindow: 1_000_000,
      inputPricePerMillion: 0.3,
      outputPricePerMillion: 2.5,
    });
    expect(estimate.calls).toBe(4);
    expect(estimate.inputTokens).toBeGreaterThan(160_000);
    expect(estimate.inputTokens).toBeLessThan(170_000);
    expect(estimate.minutesLow).toBeLessThanOrEqual(4.5);
    expect(estimate.minutesHigh).toBeGreaterThanOrEqual(4.5);
    expect(formatMinutes(estimate.minutesLow, estimate.minutesHigh)).not.toBe('about 1 minute');
    const tiny = estimateRead({
      depth: 'quick',
      conversationCount: 2,
      userTokens: 278,
      fullTokens: 400,
      contextWindow: 1_000_000,
      inputPricePerMillion: 0.3,
      outputPricePerMillion: 2.5,
    });
    expect(tiny.calls).toBe(1);
    expect(tiny.minutesHigh).toBeLessThan(3);
  });

  it('uses the packed batch plan when one is supplied', () => {
    const heavy = Array.from({ length: 140 }, () => 'word '.repeat(20).trim()).join('\n');
    const conversations = [
      ...Array.from({ length: 5 }, (_, index) => convo(`heavy-${index}`, heavy)),
      ...Array.from({ length: 15 }, (_, index) => convo(`light-${index}`, 'short note')),
    ];
    const userTokens = conversations.reduce((sum, item) => sum + Math.ceil(item.messages[0].text.length / 4), 0);
    const batches = packBatches(conversations, 'quick', 12_000);
    const averageCalls = estimateRead({
      depth: 'quick',
      conversationCount: conversations.length,
      userTokens,
      fullTokens: userTokens,
      contextWindow: 12_000,
      inputPricePerMillion: 0.3,
      outputPricePerMillion: 2.5,
    }).calls;
    const planned = estimateRead({
      depth: 'quick',
      conversationCount: conversations.length,
      userTokens,
      fullTokens: userTokens,
      contextWindow: 12_000,
      inputPricePerMillion: 0.3,
      outputPricePerMillion: 2.5,
      plannedBatches: batches.map((batch) => ({ tokens: batch.tokens, userTokens: batch.userTokens })),
    });
    expect(batches.length).toBeGreaterThan(1);
    expect(planned.calls).toBe(batches.length);
    expect(planned.calls).not.toBe(averageCalls);
  });
});

describe('schema validation and repair', () => {
  it('accepts fenced JSON and strips a model-supplied confidence', () => {
    const raw = '```json\n{"convs":[{"c":"c1","topic":"notes"}],"facts":[{"c":"c1","k":"person","v":"Dana","d":"sister","t":null,"q":"my sister Dana","conf":0.99}]}\n```';
    const parsed = parseBatchPayload(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.facts[0]).not.toHaveProperty('conf');
    expect(parsed.value.facts[0].v).toBe('Dana');
  });

  it('drops a broken fact and keeps the valid one', () => {
    const parsed = parseBatchPayload(JSON.stringify({
      convs: [{ c: 'c1', topic: 'notes' }],
      facts: [
        { c: 'c1', k: 'person', v: 'Dana', d: null, t: null, q: null },
        { c: 'c1', k: 'not-a-kind', v: 'nope' },
      ],
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.facts).toHaveLength(1);
    expect(parsed.droppedFacts).toBe(1);
  });

  it('asks for a repair when the payload is not JSON', () => {
    const parsed = parseBatchPayload('I will not answer');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    const prompt = buildRepairPrompt('I will not answer', parsed.error);
    expect(prompt).toMatch(/Validator error/);
    expect(prompt).toMatch(/JSON/);
  });

  it('uses a fixed-field prompt and a Gemini schema', () => {
    expect(EXTRACTION_SYSTEM).toMatch(/strictly as data/);
    expect(EXTRACTION_SYSTEM).toMatch(/health/);
    expect(EXTRACTION_SYSTEM).toMatch(/substance/);
    expect(EXTRACTION_SYSTEM).toMatch(/Do not infer/);
    const gemini = toGeminiSchema({ type: 'object', properties: { q: { type: ['string', 'null'] } }, required: ['q'] });
    expect(gemini.type).toBe('OBJECT');
    expect((gemini.properties as { q: { nullable: boolean } }).q.nullable).toBe(true);
  });
});

describe('local pass and packing', () => {
  it('counts identifiers, flags health, and masks them before a model sees the text', () => {
    const parsed = runLocalPass([
      convo('c_pii', 'Email me at sam.example@example.com or (602) 555-0148. Card 4242424242424242.'),
      convo('c_health', 'My knee hurts after running.'),
      convo('c_plain', 'What is 2 + 2?'),
    ]);
    expect(parsed.exposure.emails).toEqual(['sam.example@example.com']);
    expect(parsed.exposure.phones).toHaveLength(1);
    expect(parsed.exposure.cardLike).toBe(1);
    expect(parsed.conversations.find((item) => item.id === 'c_health')?.flagged).toBe(true);
    expect(parsed.conversations.find((item) => item.id === 'c_plain')?.flagged).toBe(false);
    const packed = packConversation(parsed.conversations.length ? {
      id: 'c_pii',
      title: 'Contact',
      createdAt: null,
      sourceFormat: 'normalized',
      messages: [{ role: 'user', text: 'Email me at sam.example@example.com or (602) 555-0148. Card 4242424242424242.', timestamp: null }],
    } : convo('c_pii', ''), 'standard');
    expect(packed.text).not.toContain('sam.example@example.com');
    expect(packed.text).toContain('[email]');
    expect(packed.text).toContain('[phone]');
    expect(packed.text).toContain('[card]');
    expect(maskSensitive('keep Dana')).toContain('Dana');
  });
});

describe('budget cap and partial reports', () => {
  const conversations = [0, 1, 2].map((index) => convo(`c${index}`, `My sister Dana wrote note ${index} about the rent and a diagnosis that hurts.`));

  it('stops before the next batch would pass the cap and labels the report partial', async () => {
    let calls = 0;
    const adapter = {
      id: 'script',
      async complete(request: { user: string; schemaName: string }) {
        calls += 1;
        const ids = [...request.user.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
        return {
          text: JSON.stringify({
            convs: ids.map((id) => ({ c: id, topic: 'note' })),
            facts: ids.map((id) => ({ c: id, k: 'person', v: 'Dana', d: 'sister', t: null, q: 'My sister Dana' })),
          }),
          viaProxy: false,
          usage: { input: 4000, output: 0 },
        };
      },
    };
    const local = runLocalPass(conversations);
    const result = await runRead({
      conversations,
      local,
      depth: 'quick',
      quickFraction: 1,
        model: {
          provider: 'script',
          id: 'script',
          inputPricePerMillion: 200,
          outputPricePerMillion: 0,
          contextWindow: 2000,
        },
        budget: { maxDollars: 1 },
      adapter,
      sleep: async () => undefined,
    });
    expect(calls).toBe(1);
    expect(result.coverage.partial).toBe(true);
    expect(reportLabel(result)).toBe('Partial');
    expect(isComplete(result)).toBe(false);
    expect(result.coverage.read).toBeLessThan(result.coverage.planned);
    expect(() => persistenceFields({ ...result, coverage: { ...result.coverage, partial: false } })).toThrow(/partial/);
    expect(persistenceFields(result).partial).toBe(true);
  });

  it('does not call the model when the cap is already below one batch', async () => {
    let calls = 0;
    const local = runLocalPass(conversations);
    const result = await runRead({
      conversations,
      local,
      depth: 'quick',
      quickFraction: 1,
      model: { provider: 'script', id: 'script', inputPricePerMillion: 1000, outputPricePerMillion: 0, contextWindow: 32_000 },
      budget: { maxDollars: 0 },
      adapter: { id: 'script', async complete() { calls += 1; return { text: '{}', viaProxy: false }; } },
      sleep: async () => undefined,
    });
    expect(calls).toBe(0);
    expect(result.coverage.partial).toBe(true);
    expect(reportLabel(result)).toBe('Partial');
  });

  it('keeps the planned batch count stable when a batch is split', async () => {
    const conversations = [0, 1, 2, 3].map((index) => convo(`c${index}`, `My sister Dana wrote note ${index} about the rent.`));
    const seen: RunProgress[] = [];
    let calls = 0;
    await runRead({
      conversations,
      local: runLocalPass(conversations),
      depth: 'quick',
      quickFraction: 1,
      model: { provider: 'script', id: 'script', inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 1_000_000 },
      adapter: {
        id: 'script',
        async complete(request: { user: string }) {
          calls += 1;
          const ids = [...request.user.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
          if (ids.length > 1) throw new Error('parse failed');
          return {
            text: JSON.stringify({
              convs: ids.map((id) => ({ c: id, topic: 'note' })),
              facts: [],
            }),
            viaProxy: false,
          };
        },
      },
      sleep: async () => undefined,
      onProgress: (progress) => seen.push(progress),
    });
    expect(calls).toBeGreaterThan(1);
    expect(seen.some((progress) => progress.phase === 'batch')).toBe(true);
    expect(new Set(seen.map((progress) => progress.totalBatches))).toEqual(new Set([seen[0]?.totalBatches]));
    const batchLines = seen.filter((progress) => progress.phase === 'batch').map((progress) => progress.message);
    expect(batchLines.every((line) => line.includes(`of ${seen[0]?.totalBatches}`))).toBe(true);
    const reads = seen.map((progress) => progress.read);
    expect(reads).toEqual([...reads].sort((a, b) => a - b));
    expect(reads[reads.length - 1]).toBe(conversations.length);
  });

  it('retries a 503 without splitting the batch and says the provider is busy', async () => {
    const conversations = [0, 1, 2].map((index) => convo(`c${index}`, `My sister Dana wrote note ${index} about the rent.`));
    const seen: string[] = [];
    let calls = 0;
    const result = await runRead({
      conversations,
      local: runLocalPass(conversations),
      depth: 'quick',
      quickFraction: 1,
      model: { provider: 'script', id: 'script', inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 1_000_000 },
      adapter: {
        id: 'script',
        async complete() {
          calls += 1;
          throw new ProviderRequestError('overloaded', 503, 'server');
        },
      },
      sleep: async () => undefined,
      onProgress: (progress) => seen.push(progress.message),
    });
    expect(calls).toBe(5);
    expect(seen.some((line) => line.includes('The provider is busy (503)') && line.includes('Retrying'))).toBe(true);
    expect(result.coverage.partialReason).toMatch(/The provider failed on 3 conversations after several retries/);
    expect(plainPartialDetail(result)).toMatch(/failed on 3 conversations/);
    expect(result.coverage.failed).toBe(3);
    expect(result.coverage.narrative).not.toBe('skipped-budget');
    const merged = mergeCaseFiles(result, {
      ...result,
      coverage: {
        ...result.coverage,
        read: 3,
        failed: 0,
        partial: false,
        partialReason: undefined,
        narrative: 'not-in-depth',
        topics: [
          { c: 'c0', topic: 'note' },
          { c: 'c1', topic: 'note' },
          { c: 'c2', topic: 'note' },
        ],
      },
      narrative: {
        ...result.narrative,
        cover: 'This Quick scan read used your script key and script. It looked at a sample of user turns in 3 of 3 conversations.',
      },
    });
    expect(merged.coverage.failed).toBe(0);
    expect(merged.coverage.read).toBe(3);
    expect(merged.coverage.partial).toBe(false);
    expect(isComplete(merged)).toBe(true);
    expect(reportStatus(merged).badge).not.toBe('Partial report');
    expect(plainPartialDetail(merged)).toBe(WRITE_UP_MISSING);
    expect(plainPartialDetail(merged)).not.toMatch(/failed on 0/);
    expect(persistenceFields(merged).partial).toBe(false);
    expect(merged.narrative.cover).toMatch(/in 3 of 3 conversations/);
  });

  it('does not keep a budget narrative status when a retry finishes the chats', () => {
    const conversations = [0, 1, 2].map((index) => convo(`c${index}`, `Note ${index} about the rent.`));
    const local = runLocalPass(conversations);
    const base = {
      schema_version: '1.0' as const,
      model: { provider: 'gemini', id: 'gemini', depth: 'standard' as const },
      filedAt: '2026-11-24T00:00:00.000Z',
      coverage: {
        conversations: 3, planned: 3, read: 2, skipped: 0, batches: 2, failed: 1,
        depth: 'standard' as const, partial: true, partialReason: 'The provider failed on 1 conversation after several retries.',
        narrative: 'skipped-budget' as const, viaProxy: false,
        dateRange: { first: null, last: null },
        topics: [{ c: 'c0', topic: 'rent' }, { c: 'c1', topic: 'rent' }],
      },
      subject: {},
      people: [], places: [], orgs: [], timeline: [], projects: [],
      routines: local.routines,
      interests: [], beliefs: [], worries: [], health: [], money: [], decisions: [], open_loops: [], contradictions: [],
      exposure: local.exposure,
      style: local.style,
      usage: local.usage,
      notable: [],
      narrative: {
        cover: 'This Standard read used your gemini key and gemini. It looked at user turns in 0 of 3 conversations.',
        blurbs: {},
        ev: [],
        codename: 'Open notebook',
        codename_reason: 'A name for this case file.',
        archetype: 'Cast as Open Notebook',
      },
      cardStatus: cardStates('standard'),
    };
    const extra = {
      ...base,
      coverage: {
        ...base.coverage,
        read: 3,
        failed: 0,
        partial: false,
        partialReason: undefined,
        narrative: 'written' as const,
        topics: [{ c: 'c0', topic: 'resumed' }, { c: 'c1', topic: 'resumed' }, { c: 'c2', topic: 'rent' }],
      },
      narrative: {
        ...base.narrative,
        cover: 'You keep coming back to the rent.',
        codename: 'Second Draft',
        codename_reason: 'You rewrite the rent note until it sounds like you.',
        archetype: 'The person who rewrites the rent note',
      },
      interests: [{ v: 'monthly budget spreadsheet in Google Sheets', conf: 0.5, ev: ['c2'], src: 'ai' as const, first: null, last: null, quote: null }],
    };
    const merged = mergeCaseFiles(base, extra);
    expect(merged.coverage.partial).toBe(false);
    expect(merged.coverage.narrative).toBe('written');
    expect(merged.coverage.narrative).not.toBe('skipped-budget');
    expect(isComplete(merged)).toBe(true);
    expect(reportStatus(merged).badge).toBe('Complete report');
    expect(persistenceFields(merged).partial).toBe(false);
    expect(merged.narrative.cover).toBe('You keep coming back to the rent.');
    expect(merged.narrative.cover).not.toMatch(/in 0 of 3/);
    expect(publicSubjectName(merged)).toBe('Second Draft');
    expect(publicCodenameReason(base.narrative.codename_reason)).toBe(WRITE_UP_MISSING);
    expect(sentenceCase(merged.interests[0].v)).toBe('Monthly budget spreadsheet in Google Sheets');
  });

  it('counts down the real retry wait, and a later attempt waits longer', async () => {
    expect(retryWaitMs(0)).toBe(2000);
    expect(retryWaitMs(1)).toBe(4000);
    expect(retryWaitMs(0, 90_000)).toBe(90_000);
    const seen: number[] = [];
    let calls = 0;
    await completeWithRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new ProviderRequestError('overloaded', 503, 'server');
        return 'ok';
      },
      async () => undefined,
      (info) => seen.push(info.waitMs),
    );
    expect(calls).toBe(3);
    expect(seen[0]).toBe(2000);
    expect(seen[1]).toBe(1000);
    expect(seen).toContain(4000);
    expect(Math.max(...seen)).toBeGreaterThan(2000);
  });

  it('stops on an invalid key instead of a batch-failed report', async () => {
    const conversations = [0, 1, 2].map((index) => convo(`c${index}`, `My sister Dana wrote note ${index}.`));
    let calls = 0;
    const run = runRead({
      conversations,
      local: runLocalPass(conversations),
      depth: 'quick',
      quickFraction: 1,
      model: { provider: 'gemini', id: 'gemini-3.5-flash-lite', inputPricePerMillion: 0.3, outputPricePerMillion: 2.5, contextWindow: 1_000_000 },
      adapter: {
        id: 'gemini',
        async complete() {
          calls += 1;
          throw new ProviderRequestError('API key not valid. Please pass a valid API key.', 400, 'bad');
        },
      },
      sleep: async () => undefined,
    });
    await expect(run).rejects.toThrow(PROVIDER_AUTH_MESSAGE);
    expect(calls).toBe(1);
  });
});

describe('demo pipeline', () => {
  it('reads the sample export end to end and ignores model confidence', async () => {
    const conversations = buildSampleConversations();
    const local = runLocalPass(conversations);
    const result = await runRead({
      conversations,
      local,
      depth: 'deep',
      model: { provider: 'demo', id: 'demo-extractor', inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 100_000 },
      adapter: createDemoAdapter({ latencyMs: 0 }),
      sleep: async () => undefined,
    });
    expect(result.coverage.partial).toBe(false);
    expect(reportLabel(result)).toBe('Complete');
    expect(reportStatus(result).badge).toBe('Complete report');
    const standard = selectConversations(local, 'standard');
    expect(standard.chosenIds).toEqual(expect.arrayContaining(['c_sister', 'c_work', 'c_money', 'c_health', 'c_pii', 'c_worry', 'c_distress']));
    expect(standard.chosenIds).not.toContain('c_trivial');
    expect(result.people.some((person) => person.name === 'Dana')).toBe(true);
    expect(result.subject.location?.v).toMatch(/Phoenix/);
    expect(result.decisions.some((item) => /rent/i.test(item.v))).toBe(true);
    expect(result.supportNote).toMatch(/988/);
    expect(JSON.stringify(result.health)).not.toMatch(/hopeless/i);
    expect(JSON.stringify(result.worries)).not.toMatch(/hopeless/i);
    expect(result.exposure.emails).toContain('sam.example@example.com');
    const conf = computeConfidence({ support: 1, corroborated: true, recent: true, hasQuote: true });
    expect(conf).not.toBe(0.99);
    expect(result.people.find((person) => person.name === 'Dana')?.conf).toBeLessThan(0.99);
    const premium = hydratePremiumReport(result, new Map(conversations.map((conversation) => [conversation.id, conversation.title])));
    expect(premium.fbiReport?.subjectProfileSummary).toMatch(/Dana|Phoenix|rent/i);
    expect(premium.piiSafetyCompass?.summary).toMatch(/email/i);
    expect(premium.linguisticFingerprint?.overallStyleDescription).toMatch(/words per message/);
    expect(JSON.stringify(premium.digitalDoppelganger?.posts)).not.toMatch(/cognitive flexibility/);
    expect(premium.topInterestingConversations?.length).toBeGreaterThan(0);
    const previews = cardPreviews(result, premium);
    expect(previews.fbi).not.toBe(previews.reality);
    expect(previews.fbi).not.toBe(previews.mirror);
    expect(previews.reality).not.toBe(previews.mirror);
    expect(previews.reality).not.toMatch(/You mention Dana as your sister/);
    expect(previews.reality).toMatch(/rewrites the call sheet/);
    expect(previews.reality).not.toMatch(/engineer|team lead|Phoenix/i);
    expect(previews.top5).toMatch(/Contact card is one of the chats this read kept/);
    expect(previews.top5).toMatch(/threads on file/);
    expect(previews.top5).not.toBe('Contact card');
    expect(premium.realityTVPersona?.personaArchetype).toBe('The producer who rewrites the call sheet');
    expect(premium.realityTVPersona?.reportTitle).toBe(premium.realityTVPersona?.personaArchetype);
    expect(previews.mirror).not.toMatch(/You mention Dana as your sister/);
    expect(reportSubtitle(result)).toBe(`Deep read · ${result.coverage.read} of ${result.coverage.conversations} conversations · Demo extractor`);
    expect(result.narrative.codename).toBe('Second Draft');
    expect(result.narrative.codename_reason).toMatch(/rewrite things until they sound right before sending/);
    expect(premium.fbiReport?.subjectCodename.name).toBe('Second Draft');
    expect(premium.fbiReport?.subjectCodename.justification).toBe(result.narrative.codename_reason);
    expect(premium.fbiReport?.subjectCodename.name).not.toMatch(/engineer|Phoenix|Dana/i);
    expect(premium.fbiReport?.psychologicalProfile).toMatch(/rewriting the launch checklist/);
    expect(caseFileNumber('Second Draft|demo-extractor|8')).toMatch(/^CI-\d{4}$/);
    expect(caseFileNumber('Second Draft|demo-extractor|8')).toBe(caseFileNumber('Second Draft|demo-extractor|8'));
    expect(settleCodename({ codename: 'backend engineer', codename_reason: 'Because of the job title.' }, ['backend engineer']).codename).toBe(NEUTRAL_CODENAME);
    expect(settleArchetype('backend engineer, moved into team lead', 'Second Draft', ['backend engineer, moved into team lead'])).toBe('Cast as Second Draft');
    expect(settleArchetype('The Determined Career Pivot Strategist', 'Second Draft', [])).toBe('Cast as Second Draft');
    const standardFile = await runRead({
      conversations,
      local,
      depth: 'standard',
      model: { provider: 'demo', id: 'demo-extractor', inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 100_000 },
      adapter: createDemoAdapter({ latencyMs: 0 }),
      sleep: async () => undefined,
    });
    expect(reportStatus(standardFile).badge).toBe('Complete report');
    expect(reportStatus(standardFile).detail).toMatch(/not flagged/);
    expect(reportSubtitle(standardFile)).toMatch(/unflagged chats were not sent/);
    expect(displayBadge(standardFile, true)).toBe('Sample report');
    expect(displayBadge(standardFile)).toBe('Complete report');
    expect(savedModelLabel('gemini', 'gemini-3.5-flash-lite')).toBe('gemini-3.5-flash-lite');
    expect(savedModelLabel('openai', 'gpt-5.4-mini')).toBe('openai gpt-5.4-mini');
    expect(sentenceCase('high school chemistry teacher')).toBe('High school chemistry teacher');
    expect(sentenceCase('High school chemistry teacher')).toBe('High school chemistry teacher');
    expect(sentenceCase('overspending on eating out')).toBe('Overspending on eating out');
    expect(sentenceCase('daughter')).toBe('Daughter');
    expect(sentenceCase('“worried about the launch deadline”')).toBe('“Worried about the launch deadline”');
    expect(sentenceCase('iPhone notes')).toBe('iPhone notes');
    expect(sentenceCase('High School Chemistry Teacher')).toBe('High school chemistry teacher');
    expect(sentenceCase('always overspend on eating out')).toBe('Always overspend on eating out');
    expect(sentenceCase('monthly budget spreadsheet in Google Sheets')).toBe('Monthly budget spreadsheet in Google Sheets');
    expect(sentenceCase('a self-description')).toBe('A self-description');
    expect(publicCodenameReason('A short name for this file, not a fact copied from one chat.')).toBe(WRITE_UP_MISSING);
    expect(publicCodenameReason('A plain name for this case file. It is not a claim taken from one chat.')).toBe(WRITE_UP_MISSING);
    expect(publicCodenameReason('A name for this case file.')).toBe(WRITE_UP_MISSING);
    expect(sourceLabels(['c2', 'c0'], new Map([['c0', 'Rent'], ['c2', 'Budget']]), new Map([['c0', 0], ['c2', 2]]))).toEqual([
      'Conversation 3 · Budget',
      'Conversation 1 · Rent',
    ]);
    expect(vocabularyMeterValue({ vocabulary: 0.603, wordsPerMessage: 40 })).toBeCloseTo(0.603);
    expect(vocabularyMeterValue({ vocabulary: 0.603, wordsPerMessage: 40 })).not.toBe(1);
    expect(caseDownloadName('claude_conversations.json')).toBe('claude_conversations-case-file.json');
    expect(caseDownloadName('claude_conversations.json.json')).toBe('claude_conversations-case-file.json');
    expect(isThinProfileLabel('8 years')).toBe(true);
    expect(isThinProfileLabel('8years')).toBe(true);
    const traits = hydratePremiumReport(standardFile, new Map()).realityTVPersona?.characterTraits ?? [];
    expect(traits.join(' ')).not.toMatch(/Dana/);
    const quickFile = await runRead({
      conversations,
      local,
      depth: 'quick',
      quickFraction: 0.5,
      model: { provider: 'demo', id: 'demo-extractor', inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 100_000 },
      adapter: createDemoAdapter({ latencyMs: 0 }),
      sleep: async () => undefined,
    });
    expect(isComplete(quickFile)).toBe(true);
    expect(reportStatus(quickFile).badge).toBe(`Quick scan, ${quickFile.coverage.read} of ${quickFile.coverage.conversations}`);
    expect(reportStatus(quickFile).badge).not.toBe('Partial report');
    expect(reportStatus(quickFile).badge).not.toBe(reportStatus(result).badge);
    expect(reportStatus(quickFile).detail).toMatch(/sample/);
    expect(standardFile.cardStatus.stranger).toBe('ready');
    expect(standardFile.cardStatus.file).not.toBe('partial');
    expect(isEchoedPlaceholder('A profound, unvarnished observation about your inner patterns and motivations.')).toBe(true);
    expect(decisionText('switching to data analytics', 'switching to data analytics')).toBe('switching to data analytics');
    expect(decisionText('Rent or buy?', 'keep renting')).toBe('Rent or buy?: keep renting');
  });
});

describe('a real-shaped standard report', () => {
  it('does not repeat empty states, raw codes, double hashes, or another card’s sentence', () => {
    const cited = (v: string): CaseFile['interests'][number] => ({
      v, conf: 0.5, ev: ['c1'], src: 'ai', first: null, last: null, quote: null,
    });
    const file: CaseFile = {
      schema_version: '1.0',
      model: { provider: 'gemini', id: 'gemini-3.5-flash-lite', depth: 'standard' },
      coverage: {
        conversations: 3, planned: 2, read: 2, skipped: 1, batches: 1, failed: 0,
        depth: 'standard', partial: false, narrative: 'written', viaProxy: false,
        dateRange: { first: null, last: null }, topics: [],
      },
      subject: {},
      people: [],
      places: [],
      orgs: [],
      timeline: [],
      projects: [],
      routines: { hours: [], weekdays: [], peakHours: [], lateNightShare: 0, longestStreak: 0 },
      interests: [cited('#dataanalytics'), cited('##mealpreponSundays'), cited('resumed'), cited('Resumed'), cited('data analytics')],
      beliefs: [],
      worries: [],
      health: [],
      money: [],
      decisions: [],
      open_loops: [],
      contradictions: [],
      exposure: { emails: [], phones: [], cardLike: 0, urls: 0, keyLike: 0, ev: [] },
      style: {
        wordsPerMessage: 12, vocabulary: 0.4, questionShare: 0.1, swearCount: 0,
        topPhrases: ["don't want", 'lab notes'], userMessages: 4, userWords: 40,
      },
      usage: { providers: [], byMonth: [], longest: [] },
      notable: [
        { id: 'c1', title: 'Cover letter for a data analyst role', score: 4, reasons: ['self'], modelRead: true },
        { id: 'c2', title: 'Budget spreadsheet formulas', score: 3, reasons: ['money'], modelRead: true },
      ],
      narrative: {
        cover: 'You keep a lab notebook next to the household budget.',
        blurbs: {},
        ev: ['32e1c0dd-1111-4111-8111-111111111111'],
        codename: 'Beakers And Balance Sheets',
        codename_reason: 'This alias points to the habit of pairing scientific inquiry with financial organization.',
        archetype: 'The ambitious pivot seeker building dashboards',
      },
      cardStatus: cardStates('standard'),
    };
    const hydrated = hydratePremiumReport(file, new Map());
    const previews = cardPreviews(file, hydrated);
    expect(previews.decisions).toBe(EMPTY_IN_CHATS);
    expect(previews.mind).toBe(EMPTY_IN_CHATS);
    expect(previews.mirror).toBe(EMPTY_IN_CHATS);
    expect(hydrated.unfilteredMirror?.observation).toBe(EMPTY_IN_CHATS);
    expect(displayTitle('Cover letter for a data analyst role copy')).toBe('Cover letter for a data analyst role');
    expect(normalizeTitleCase('Beakers And Budgets')).toBe('Beakers and Budgets');
    expect(normalizeTitleCase('Spreadsheets and Sourdough Notebook')).toBe('Spreadsheets and Sourdough Notebook');
    expect(hydrated.realityTVPersona?.reportTitle).toBe('The ambitious pivot seeker building dashboards');
    expect(hydrated.realityTVPersona?.description).toBe('');
    expect(hydrated.realityTVPersona?.description).not.toBe(hydrated.fbiReport?.subjectCodename.justification);
    expect(hydrated.fbiReport?.dominantInterests).toEqual(['#dataanalytics', '##mealpreponSundays', 'Data analytics']);
    expect(hydrated.fbiReport?.dominantInterests).not.toContain('resumed');
    expect(hydrated.fbiReport?.subjectCodename.operationalSignificance).toBeUndefined();
    expect(JSON.stringify(hydrated.fbiReport)).not.toMatch(/32e1c0dd/);
    expect(conversationTitle('32e1c0dd-1111-4111-8111-111111111111', new Map([['32e1c0dd-1111-4111-8111-111111111111', 'Cover letter']]))).toBe('Cover letter');
    expect(uniqueDisplay(['resumed', 'Resumed', 'data analytics'], true)).toEqual(['data analytics']);
    expect(toHashtag('#dataanalytics')).toBe('#dataanalytics');
    expect(hydrated.fbiReport?.disclaimer).toBe('');
    expect(hydrated.realityTVPersona?.disclaimer).toBe('');
    const posts = JSON.stringify(hydrated.digitalDoppelganger?.posts);
    expect(posts).not.toMatch(/\bself\b|\bmoney\b/);
    expect(posts).toContain('Cover letter for a data analyst role');
    expect(hydrated.digitalDoppelganger?.topHashtags).toEqual(['#dataanalytics', '#mealpreponSundays']);
    expect(hydrated.digitalDoppelganger?.topHashtags.join(' ')).not.toContain('##');
    expect(hydrated.linguisticFingerprint?.vocabularyProfile.notableWords).not.toContain("don't want");
    expect(hydrated.linguisticFingerprint?.vocabularyProfile.notableWords).toContain('lab notes');
    expect(toHashtag('##mealpreponSundays')).toBe('#mealpreponSundays');
    expect(scrubRawCodes('Budget spreadsheet formulas. money')).toBe('Budget spreadsheet formulas');
    expect(notablePhraseOk("don't want")).toBe(false);
  });
});

describe('provider adapters', () => {
  function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  }

  it('sends OpenAI structured output, then falls back when the host rejects the schema', async () => {
    const seen: { url: string; body: string; authorization?: string }[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      seen.push({ url, body: String(init.body ?? ''), authorization: new Headers(init.headers).get('authorization') ?? undefined });
      if (seen.length === 1) return jsonResponse({ error: 'response_format json_schema is unsupported' }, 400);
      return jsonResponse({ choices: [{ message: { content: '{"convs":[],"facts":[]}' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } });
    };
    const adapter = createOpenAICompatibleAdapter('openai', {
      apiKey: 'sk-test-key',
      model: 'gpt-test',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchImpl as never,
      proxy: 'never',
    });
    const result = await adapter.complete({ system: 'sys', user: 'user', schemaName: 'batch_extract', maxOutputTokens: 100 });
    expect(seen[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(seen[0].authorization).toBe('Bearer sk-test-key');
    expect(seen[0].body).toContain('json_schema');
    expect(seen[1].body).toContain('json_object');
    expect(result.text).toContain('facts');
  });

  it('calls xAI and a custom base URL through the OpenAI-compatible adapter', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] });
    };
    await createOpenAICompatibleAdapter('xai', {
      apiKey: 'xai-key',
      model: 'grok-4.3',
      baseUrl: 'https://api.x.ai/v1',
      fetchImpl: fetchImpl as never,
      proxy: 'never',
    }).complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 20 });
    await createOpenAICompatibleAdapter('custom', {
      apiKey: 'local',
      model: 'llama',
      baseUrl: 'http://localhost:11434/v1',
      fetchImpl: fetchImpl as never,
      proxy: 'never',
    }).complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 20 });
    expect(urls[0]).toBe('https://api.x.ai/v1/chat/completions');
    expect(urls[1]).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('sends Gemini a response schema and the API key header', async () => {
    let captured = '';
    let header = '';
    const fetchImpl = async (url: string, init: RequestInit) => {
      captured = String(init.body);
      header = new Headers(init.headers).get('x-goog-api-key') ?? '';
      expect(url).toContain('generativelanguage.googleapis.com');
      return jsonResponse({ candidates: [{ content: { parts: [{ text: '{"convs":[],"facts":[]}' }] } }] });
    };
    await createGeminiAdapter({ apiKey: 'gem-key', model: 'gemini-3.5-flash-lite', fetchImpl: fetchImpl as never, proxy: 'never' })
      .complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 20 });
    expect(header).toBe('gem-key');
    expect(captured).toContain('responseSchema');
    expect(captured).toContain('OBJECT');
  });

  it('treats a Gemini 400 for a bad key as an auth rejection', async () => {
    const fetchImpl = async () => jsonResponse({
      error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
    }, 400);
    const adapter = createGeminiAdapter({
      apiKey: 'not-a-key',
      model: 'gemini-3.5-flash-lite',
      fetchImpl: fetchImpl as never,
      proxy: 'never',
    });
    await expect(adapter.complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 20 }))
      .rejects.toMatchObject({ kind: 'auth', message: PROVIDER_AUTH_MESSAGE });
  });

  it('sends Anthropic the browser opt-in header', async () => {
    let header = '';
    const fetchImpl = async (_url: string, init: RequestInit) => {
      header = new Headers(init.headers).get(ANTHROPIC_BROWSER_HEADER) ?? '';
      expect(new Headers(init.headers).get('origin')).toBeNull();
      return jsonResponse({ content: [{ type: 'text', text: '{"convs":[],"facts":[]}' }], stop_reason: 'end_turn' });
    };
    await createAnthropicAdapter({ apiKey: 'ant-key', model: 'claude-haiku-5-5', fetchImpl: fetchImpl as never, proxy: 'never' })
      .complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 20 });
    expect(header).toBe('true');
  });

  it('falls back to the pass-through for an allowlisted host and refuses localhost', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push(url);
      if (url.startsWith('https://api.openai.com')) throw new TypeError('Failed to fetch');
      expect(new Headers(init.headers).get('x-ci-host')).toBe('api.openai.com');
      expect(new Headers(init.headers).get('origin')).toBeNull();
      return jsonResponse({ choices: [{ message: { content: '{"convs":[],"facts":[]}' } }] });
    };
    const adapter = createOpenAICompatibleAdapter('openai', {
      apiKey: 'sk-test',
      model: 'gpt-test',
      fetchImpl: fetchImpl as never,
    });
    const result = await adapter.complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 10 });
    expect(result.viaProxy).toBe(true);
    expect(calls[1]).toBe('/api/provider-proxy');

    const local = createOpenAICompatibleAdapter('ollama', {
      apiKey: 'none',
      model: 'llama',
      baseUrl: 'http://localhost:11434/v1',
      fetchImpl: (async () => { throw new TypeError('Failed to fetch'); }) as never,
    });
    await expect(local.complete({ system: 's', user: 'u', schemaName: 'batch_extract', maxOutputTokens: 10 })).rejects.toThrow(/never sent through/i);
  });
});

describe('pass-through policy', () => {
  it('blocks private hosts, unknown hosts, oversized bodies, and extra rate', async () => {
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('10.1.2.3')).toBe(true);
    expect(isPrivateHost('192.168.1.9')).toBe(true);
    expect(isProxyCandidate('api.openai.com')).toBe(true);
    expect(isProxyCandidate('evil.example')).toBe(false);

    const limiter = createRateLimiter(2, 60_000);
    const fetchImpl = async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      expect(headers.get('origin')).toBeNull();
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('referer')).toBeNull();
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(headers.get('authorization')).toBe('Bearer sk-test');
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const good = () => handleProxyRequest(new Request('https://chatinsights.example/api/provider-proxy', {
      method: 'POST',
      headers: {
        'x-ci-host': 'api.openai.com',
        'x-ci-path': '/v1/chat/completions',
        'x-ci-method': 'POST',
        authorization: 'Bearer sk-test',
        origin: 'https://chatinsightson.netlify.app',
        cookie: 'session=secret',
        referer: 'https://chatinsightson.netlify.app/read',
        'content-type': 'application/json',
      },
      body: '{"hello":1}',
    }), { ip: '203.0.113.5', fetchImpl: fetchImpl as typeof fetch, now: 1_000, limiter });

    expect((await good()).status).toBe(200);
    expect((await good()).status).toBe(200);
    expect((await good()).status).toBe(429);

    const blocked = await handleProxyRequest(new Request('https://chatinsights.example/api/provider-proxy', {
      method: 'POST',
      headers: { 'x-ci-host': '127.0.0.1', 'x-ci-path': '/v1/chat/completions' },
      body: '{}',
    }), { ip: '203.0.113.9', fetchImpl: fetchImpl as typeof fetch, limiter: createRateLimiter() });
    expect(blocked.status).toBe(403);

    const huge = await handleProxyRequest(new Request('https://chatinsights.example/api/provider-proxy', {
      method: 'POST',
      headers: {
        'x-ci-host': 'api.openai.com',
        'x-ci-path': '/v1/chat/completions',
        'content-length': '50',
      },
      body: '12345',
    }), { ip: '203.0.113.8', maxBytes: 4, limiter: createRateLimiter(), fetchImpl: fetchImpl as typeof fetch });
    expect(huge.status).toBe(413);
  });
});

describe('key storage', () => {
  it('encrypts with a non-extractable key and can forget one entry', async () => {
    const store = memoryVaultStore();
    const saved = await rememberKey(store, { provider: 'openai', label: 'Work', secret: 'sk-live-secret' });
    const listed = await listKeys(store);
    expect(JSON.stringify(listed)).not.toContain('sk-live-secret');
    expect(listed[0]).toMatchObject({ provider: 'openai', label: 'Work', locked: false });
    const device = await store.get('meta', 'device-key') as CryptoKey;
    expect(device.extractable).toBe(false);
    expect(await revealKey(store, saved.id)).toBe('sk-live-secret');
    await forgetKey(store, saved.id);
    await expect(revealKey(store, saved.id)).rejects.toThrow(/No saved key/);
  });

  it('wraps a key with a passphrase and leaves the device key unable to open it', async () => {
    expect(DEFAULT_PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(100_000);
    const store = memoryVaultStore();
    const saved = await rememberKey(store, {
      provider: 'anthropic',
      label: 'Home',
      secret: 'ant-secret',
      passphrase: 'correct horse',
      iterations: 1000,
    });
    const record = await store.get('keys', saved.id) as { ciphertext: string; kdf: string };
    expect(record.kdf).toBe('passphrase');
    expect(record.ciphertext).not.toContain('ant-secret');
    await expect(revealKey(store, saved.id)).rejects.toThrow(/passphrase/);
    await expect(revealKey(store, saved.id, 'wrong')).rejects.toThrow();
    expect(await revealKey(store, saved.id, 'correct horse')).toBe('ant-secret');
    await forgetAllKeys(store);
    expect(await listKeys(store)).toEqual([]);
  });
});

describe('idempotent report rows', () => {
  it('replaces a row with the same user and export fingerprint', async () => {
    const first = { userId: 'user-1', fingerprint: 'abc', partial: true };
    const second = { userId: 'user-1', fingerprint: 'abc', partial: false };
    const other = { userId: 'user-1', fingerprint: 'def', partial: false };
    expect(upsertByConflict([first, other], second)).toEqual([second, other]);
    const conversations = buildSampleConversations();
    const again = buildSampleConversations();
    again[0] = { ...again[0], messages: [...again[0].messages, { role: 'user', text: 'extra', timestamp: null }] };
    expect(await exportFingerprint(conversations)).toBe(await exportFingerprint(buildSampleConversations()));
    expect(await exportFingerprint(conversations)).not.toBe(await exportFingerprint(again));
  });

  it('refuses to persist a partial file as a complete success', () => {
    const local = runLocalPass(buildSampleConversations());
    const file = buildCaseFile({
      conversations: buildSampleConversations(),
      local,
      depth: 'quick',
      provider: 'demo',
      model: 'demo',
      facts: [],
      topics: [],
      plannedIds: ['c_sister'],
      skippedIds: [],
      failedIds: [],
      batches: 0,
      narrative: null,
      narrativeStatus: 'not-in-depth',
      viaProxy: false,
      partialReason: 'budget',
    });
    expect(file.coverage.partial).toBe(true);
    expect(caseFileRow('user-1', 'fp', 'export.json', file).partial).toBe(true);
    expect(isComplete(file)).toBe(false);
  });
});

describe('content security policy', () => {
  it('ships the same policy as public/_headers and does not allow inline scripts', () => {
    const headers = readFileSync(new URL('../../../public/_headers', import.meta.url), 'utf8');
    expect(headers).toContain(CONTENT_SECURITY_POLICY);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(CONTENT_SECURITY_POLICY).toContain('https://api.openai.com');
    expect(CONTENT_SECURITY_POLICY).toContain('https://api.anthropic.com');
    expect(donationHref('https://ko-fi.com/example')).toBe('https://ko-fi.com/example');
    expect(donationHref('javascript:alert(1)')).toBeNull();
    expect(donationHref('')).toBeNull();
  });
});

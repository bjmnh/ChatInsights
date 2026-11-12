import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './csp.ts';
import { donationHref } from './donation.ts';
import { cardStates, selectConversations, batchSizeFor } from './depth.ts';
import { estimateRead, estimateWorkedExample, formatCost } from './estimate.ts';
import { runLocalPass } from './localPass.ts';
import { hydratePremiumReport } from './hydratePremium.ts';
import { buildCaseFile, computeConfidence, isComplete, reportLabel } from './merge.ts';
import { maskSensitive, packConversation } from './pack.ts';
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
import { runRead } from './runner.ts';
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
    expect(cardStates('standard').stranger).toBe('partial');
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

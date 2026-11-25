import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { Adapter, CompleteRequest } from './adapters.ts';
import { applyNarrativeResult, buildCaseFile, providerFailureDetail, unreadCount, type CaseFile, type NarrativeStatus } from './merge.ts';
import { packBatches, packConversation, type PackedBatch } from './pack.ts';
import { EXTRACTION_SYSTEM, NARRATIVE_SYSTEM, QUICK_ADDENDUM, VERIFY_SYSTEM } from './prompts.ts';
import {
  buildRepairPrompt,
  parseBatchPayload,
  parseNarrativePayload,
  parseVerifyPayload,
  type Fact,
  type NarrativeDraft,
} from './schema.ts';
import { modelBatchCap, selectConversations, type DepthId } from './depth.ts';
import type { LocalReport } from './localPass.ts';
import { toneOk } from './checks.ts';
import { completeWithRetry, providerAuthError, providerWaitMessage, ProviderRequestError } from './transport.ts';

export interface RunModel {
  provider: string;
  id: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  contextWindow: number;
}

export interface RunBudget {
  maxDollars?: number;
  maxTokens?: number;
}

export interface RunProgress {
  phase: 'packing' | 'batch' | 'repair' | 'narrative' | 'verify' | 'paused' | 'done';
  completedBatches: number;
  totalBatches: number;
  read: number;
  planned: number;
  viaProxy: boolean;
  routeKnown: boolean;
  routeLine: string;
  message: string;
}

export interface RunInput {
  conversations: NormalizedConversation[];
  local: LocalReport;
  depth: DepthId;
  quickFraction?: number;
  model: RunModel;
  budget?: RunBudget;
  adapter: Adapter;
  alreadyReadIds?: string[];
  /** Original plan. When set, retry does not recompute a Quick or Standard selection. */
  selectedIds?: string[];
  sleep?: (ms: number) => Promise<void>;
  isPaused?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (progress: RunProgress) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    xai: 'xAI',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    groq: 'Groq',
    openrouter: 'OpenRouter',
  };
  return names[provider] ?? provider;
}

/** Two at a time for hosts that were not the ones hitting 429s in live reads. A 429 drops back to one. */
export function parallelLimit(provider: string): number {
  if (provider === 'xai' || provider === 'openai' || provider === 'anthropic') return 2;
  return 1;
}

export function isReasoningModel(provider: string, modelId: string): boolean {
  return provider === 'xai' || /grok/i.test(modelId);
}

function compactCoverInput(topics: { c: string; topic: string }[], facts: Fact[]): string {
  const topicLines = [...new Set(topics.map((topic) => topic.topic.trim()).filter(Boolean))].slice(0, 12);
  const findings = facts.slice(0, 20).map((fact) => `${fact.k}: ${fact.v.replace(/\s+/g, ' ').slice(0, 120)}`);
  return JSON.stringify({ topics: topicLines, findings });
}

function writeUpSkipReason(budget: RunBudget | undefined, spentDollars: number, spentTokens: number, estimate: { dollars: number; inputTokens: number; outputTokens: number }): string {
  if (budget?.maxTokens != null && spentTokens + estimate.inputTokens + estimate.outputTokens > budget.maxTokens) {
    return `The write-up was skipped because the token cap (${budget.maxTokens.toLocaleString()} tokens) was reached. Clear the cap and retry the write-up.`;
  }
  if (budget?.maxDollars != null && spentDollars + estimate.dollars > budget.maxDollars) {
    return `The write-up was skipped because the dollar cap ($${budget.maxDollars}) was reached. Clear the cap and retry the write-up.`;
  }
  return 'The write-up was skipped because the budget cap was reached. Clear the cap and retry the write-up.';
}

function dollars(inputTokens: number, outputTokens: number, model: RunModel): number {
  return (inputTokens / 1_000_000) * model.inputPricePerMillion + (outputTokens / 1_000_000) * model.outputPricePerMillion;
}

function batchEstimate(batch: PackedBatch, depth: DepthId, model: RunModel) {
  const inputTokens = batch.tokens + 3000;
  const outputTokens = Math.max(32, Math.round(batch.userTokens * (depth === 'quick' ? 0.08 : 0.15)));
  return { inputTokens, outputTokens, dollars: dollars(inputTokens, outputTokens, model) };
}

function wouldExceed(spentDollars: number, spentTokens: number, estimate: { dollars: number; inputTokens: number; outputTokens: number }, budget?: RunBudget): boolean {
  if (!budget) return false;
  if (budget.maxDollars != null && spentDollars + estimate.dollars > budget.maxDollars + 1e-9) return true;
  if (budget.maxTokens != null && spentTokens + estimate.inputTokens + estimate.outputTokens > budget.maxTokens) return true;
  return false;
}

async function waitIfPaused(input: RunInput, sleep: (ms: number) => Promise<void>, snapshot: () => RunProgress) {
  while (input.isPaused?.()) {
    if (input.signal?.aborted) return;
    input.onProgress?.({ ...snapshot(), phase: 'paused', message: 'Paused. Resume when you want the next batch to go out.' });
    await sleep(50);
  }
}

export async function runRead(input: RunInput): Promise<CaseFile> {
  const sleep = input.sleep ?? defaultSleep;
  const byId = new Map(input.conversations.map((conversation) => [conversation.id, conversation]));
  const computed = selectConversations(input.local, input.depth, input.quickFraction ?? 0.1);
  const chosenIds = input.selectedIds?.length
    ? input.selectedIds.filter((id) => byId.has(id))
    : computed.chosenIds;
  const chosen = new Set(chosenIds);
  const selection = {
    chosenIds,
    skippedIds: input.selectedIds?.length
      ? input.conversations.map((conversation) => conversation.id).filter((id) => !chosen.has(id))
      : computed.skippedIds,
  };
  const already = new Set(input.alreadyReadIds ?? []);
  const pendingIds = selection.chosenIds.filter((id) => !already.has(id));
  const batchCap = modelBatchCap(input.model.provider, input.model.id, input.depth);
  const queue = packBatches(
    pendingIds.map((id) => byId.get(id)).filter((item): item is NormalizedConversation => Boolean(item)),
    input.depth,
    input.model.contextWindow || 32_000,
    batchCap,
  );
  const facts: Fact[] = [];
  const topics: { c: string; topic: string }[] = [];
  for (const id of selection.chosenIds) {
    if (already.has(id)) topics.push({ c: id, topic: 'resumed' });
  }
  const failed = new Set<string>();
  let viaProxy = false;
  let routeKnown = false;
  let routeLine = `Sending directly to ${providerDisplayName(input.model.provider)}.`;
  let parallel = parallelLimit(input.model.provider);
  let spentDollars = 0;
  let spentTokens = 0;
  let completed = 0;
  let stopReason: string | undefined;
  let overloadKind: 'rate' | 'server' | 'timeout' | undefined;
  const plannedBatchCount = queue.length;
  const accounted = new Set<string>();
  for (const id of selection.chosenIds) {
    if (already.has(id)) accounted.add(id);
  }

  const progress = (phase: RunProgress['phase'], message: string): RunProgress => ({
    phase,
    completedBatches: Math.min(completed, plannedBatchCount),
    totalBatches: plannedBatchCount,
    read: accounted.size,
    planned: selection.chosenIds.length,
    viaProxy,
    routeKnown,
    routeLine,
    message,
  });

  const batchMessage = (batch: PackedBatch, note?: string) => {
    if (!plannedBatchCount) return note || 'Reading.';
    const index = Math.min(completed + 1, plannedBatchCount);
    const size = `${batch.ids.length} conversation${batch.ids.length === 1 ? '' : 's'} in this call`;
    const head = `Reading batch ${index} of ${plannedBatchCount} (${size}).`;
    return note ? `${head} ${note}` : head;
  };

  const onRetry = (info: { attempt: number; waitMs: number; status: number }) => {
    if (info.status === 429) parallel = 1;
    input.onProgress?.(progress(
      'batch',
      providerWaitMessage(info.status, info.waitMs, info.attempt),
    ));
  };
  const onAttempt = (attempt: number) => {
    input.onProgress?.(progress('batch', `Trying again (attempt ${attempt} of 5).`));
  };

  input.onProgress?.(progress('packing', 'Packing the chats that this depth will send.'));

  // xAI, OpenAI, and Anthropic send two batches at a time. A 429 drops the rest of the read back to one,
  // and that wait still follows Retry-After. Gemini and everyone else stay at one.
  let reservedDollars = 0;
  let reservedTokens = 0;
  while (queue.length && stopReason !== 'budget' && stopReason !== 'stopped') {
    if (input.signal?.aborted) {
      stopReason = 'stopped';
      break;
    }
    await waitIfPaused(input, sleep, () => progress('paused', 'Paused.'));
    if (input.signal?.aborted) {
      stopReason = 'stopped';
      break;
    }
    const wave: PackedBatch[] = [];
    while (wave.length < parallel && queue.length) {
      const next = queue[0];
      const estimate = batchEstimate(next, input.depth, input.model);
      if (wouldExceed(spentDollars + reservedDollars, spentTokens + reservedTokens, estimate, input.budget)) {
        stopReason = 'budget';
        break;
      }
      queue.shift();
      wave.push(next);
      reservedDollars += estimate.dollars;
      reservedTokens += estimate.inputTokens + estimate.outputTokens;
    }
    if (!wave.length) break;
    input.onProgress?.(progress('batch', wave.length > 1
      ? `Reading ${wave.length} batches at a time (${wave.reduce((sum, batch) => sum + batch.ids.length, 0)} conversations).`
      : batchMessage(wave[0], wave[0].wasRetry ? 'Retrying conversations the last reply skipped.' : undefined)));
    const settled = await Promise.all(wave.map(async (batch) => {
      try {
        const extracted = await extractBatch(input, batch, sleep, onRetry, onAttempt);
        return { batch, extracted };
      } catch (error) {
        return { batch, error: error instanceof Error ? error : new Error('The batch failed') };
      }
    }));
    for (const item of settled) {
      const estimate = batchEstimate(item.batch, input.depth, input.model);
      reservedDollars -= estimate.dollars;
      reservedTokens -= estimate.inputTokens + estimate.outputTokens;
      if ('extracted' in item && item.extracted) {
        const { batch, extracted } = item;
        if (extracted.viaProxy) {
          viaProxy = true;
          routeLine = 'Calls are going through the pass-through.';
        }
        routeKnown = true;
        const known = new Set(batch.ids);
        for (const fact of extracted.facts) {
          if (known.has(fact.c)) facts.push(fact);
        }
        const returned = new Set(extracted.convs.map((conv) => conv.c));
        for (const conv of extracted.convs) {
          if (known.has(conv.c)) topics.push(conv);
        }
        const missing = batch.ids.filter((id) => !returned.has(id));
        spentDollars += extracted.usage ? dollars(extracted.usage.input, extracted.usage.output, input.model) : estimate.dollars;
        spentTokens += extracted.usage ? extracted.usage.input + extracted.usage.output : estimate.inputTokens + estimate.outputTokens;
        completed += 1;
        const retryMissing = missing.length > 0 && !batch.wasRetry;
        batch.ids.forEach((id) => {
          if (!retryMissing || !missing.includes(id)) accounted.add(id);
        });
        if (retryMissing) {
          const again = missing.map((id) => byId.get(id)).filter((conversation): conversation is NormalizedConversation => Boolean(conversation));
          const [repacked] = packBatches(again, input.depth, input.model.contextWindow || 32_000, batchCap);
          if (repacked) queue.unshift({ ...repacked, wasRetry: true });
          else missing.forEach((id) => { failed.add(id); accounted.add(id); });
        } else {
          missing.forEach((id) => { failed.add(id); accounted.add(id); });
        }
        continue;
      }
      const error = item.error;
      const batch = item.batch;
      const authError = providerAuthError(error);
      if (authError) throw authError;
      if (error instanceof ProviderRequestError && error.kind === 'rate') parallel = 1;
      if (error instanceof ProviderRequestError && error.kind === 'safety') {
        batch.ids.forEach((id) => {
          failed.add(id);
          accounted.add(id);
        });
        completed += 1;
        stopReason = stopReason ?? 'safety';
        continue;
      }
      const overload = error instanceof ProviderRequestError && (error.kind === 'server' || error.kind === 'rate' || error.kind === 'timeout');
      if (!overload && batch.ids.length > 1 && !(error instanceof ProviderRequestError && error.kind === 'cors')) {
        const mid = Math.ceil(batch.ids.length / 2);
        const left = batch.ids.slice(0, mid).map((id) => byId.get(id)).filter((conversation): conversation is NormalizedConversation => Boolean(conversation));
        const right = batch.ids.slice(mid).map((id) => byId.get(id)).filter((conversation): conversation is NormalizedConversation => Boolean(conversation));
        const pieces = [...packBatches(left, input.depth, input.model.contextWindow || 32_000, batchCap), ...packBatches(right, input.depth, input.model.contextWindow || 32_000, batchCap)];
        queue.unshift(...pieces);
        input.onProgress?.(progress('batch', batchMessage(batch, 'The last reply could not be read, so this batch was split into smaller pieces.')));
        continue;
      }
      if (error instanceof ProviderRequestError && error.kind === 'cors') throw error;
      batch.ids.forEach((id) => {
        failed.add(id);
        accounted.add(id);
      });
      completed += 1;
      if (error instanceof ProviderRequestError && error.kind === 'rate') overloadKind = 'rate';
      else if (error instanceof ProviderRequestError && error.kind === 'timeout' && overloadKind !== 'rate') overloadKind = 'timeout';
      else if (error instanceof ProviderRequestError && error.kind === 'server' && !overloadKind) overloadKind = 'server';
      stopReason = stopReason ?? 'batch-failed';
    }
  }

  if (failed.size > 0 && (!stopReason || stopReason === 'batch-failed')) {
    stopReason = providerFailureDetail(overloadKind ?? 'other', failed.size);
  }

  let narrativeStatus: NarrativeStatus = 'templated';
  let narrative: NarrativeDraft | null = null;
  const unreadPlanned = selection.chosenIds.filter((id) => !topics.some((topic) => topic.c === id) || failed.has(id));
  const extractIncomplete = unreadPlanned.length > 0 || failed.size > 0 || Boolean(stopReason);

  if (input.depth === 'forensic' && topics.length && !input.signal?.aborted) {
    const verifyEstimate = { dollars: dollars(8000, 1500, input.model), inputTokens: 8000, outputTokens: 1500 };
    if (wouldExceed(spentDollars, spentTokens, verifyEstimate, input.budget) || stopReason === 'budget') {
      stopReason = stopReason ?? 'budget';
      narrativeStatus = 'skipped-budget';
    } else {
      input.onProgress?.(progress('verify', 'Checking quotes against the cited chats.'));
      try {
        const verified = await completeWithRetry(
          () => input.adapter.complete(verifyRequest(facts)),
          sleep,
        );
        if (verified.viaProxy) viaProxy = true;
        const parsed = parseVerifyPayload(verified.text);
        if (!parsed.ok) throw new Error(parsed.error);
        const drop = new Set(parsed.value.drop);
        for (let index = facts.length - 1; index >= 0; index -= 1) {
          if (drop.has(index)) facts.splice(index, 1);
        }
        if (verified.usage) {
          spentDollars += dollars(verified.usage.input, verified.usage.output, input.model);
          spentTokens += verified.usage.input + verified.usage.output;
        }
      } catch (error) {
        if (error instanceof ProviderRequestError && (error.kind === 'auth' || error.kind === 'cors')) throw error;
        stopReason = stopReason ?? 'verification';
      }
    }
  }

  if (selection.chosenIds.length > 0 && !extractIncomplete && !stopReason) {
    const narrativeEstimate = input.depth === 'quick'
      ? { dollars: dollars(4_000, 800, input.model), inputTokens: 4_000, outputTokens: 800 }
      : { dollars: dollars(30_000, 16_000, input.model), inputTokens: 30_000, outputTokens: 16_000 };
    if (wouldExceed(spentDollars, spentTokens, narrativeEstimate, input.budget)) {
      narrativeStatus = 'skipped-budget';
      stopReason = writeUpSkipReason(input.budget, spentDollars, spentTokens, narrativeEstimate);
    } else {
      input.onProgress?.(progress('narrative', 'Writing the short cover.'));
      const written = await writeNarrative(input, facts, topics, sleep, onRetry, onAttempt);
      narrative = written.narrative;
      narrativeStatus = written.status;
      if (written.reason) stopReason = written.reason;
      if (written.viaProxy) viaProxy = true;
      routeKnown = true;
    }
  } else if (input.depth !== 'quick' && stopReason === 'budget') {
    narrativeStatus = 'skipped-budget';
  } else if (input.depth !== 'quick' && extractIncomplete) {
    narrativeStatus = 'failed-provider';
  }

  if (!stopReason && narrativeStatus === 'failed-provider') {
    stopReason = 'The write-up step did not finish for this read.';
  }

  const caseFile = buildCaseFile({
    conversations: input.conversations,
    local: input.local,
    depth: input.depth,
    provider: input.model.provider,
    model: input.model.id,
    facts,
    topics: topics.filter((topic) => !failed.has(topic.c)),
    plannedIds: selection.chosenIds,
    skippedIds: selection.skippedIds,
    failedIds: [...failed],
    batches: completed,
    narrative,
    narrativeStatus,
    viaProxy,
    partialReason: stopReason,
  });
  input.onProgress?.(progress('done', caseFile.coverage.partial ? 'Stopped early. The report is partial.' : 'Read finished.'));
  return caseFile;
}

async function extractBatch(
  input: RunInput,
  batch: PackedBatch,
  sleep: (ms: number) => Promise<void>,
  onRetry?: (info: { attempt: number; waitMs: number; status: number }) => void,
  onAttempt?: (attempt: number) => void,
) {
  const request: CompleteRequest = {
    system: input.depth === 'quick' ? `${EXTRACTION_SYSTEM}\n${QUICK_ADDENDUM}` : EXTRACTION_SYSTEM,
    user: batch.text,
    schemaName: 'batch_extract',
    maxOutputTokens: input.model.provider === 'xai' || /grok/i.test(input.model.id) ? 2048 : 8000,
  };
  const first = await completeWithRetry(() => input.adapter.complete(request), sleep, onRetry, onAttempt);
  let parsed = parseBatchPayload(first.text);
  let viaProxy = first.viaProxy;
  let usage = first.usage;
  if (!parsed.ok) {
    const repair = await completeWithRetry(
      () => input.adapter.complete({ ...request, user: buildRepairPrompt(first.text, parsed.ok ? '' : parsed.error) }),
      sleep,
      onRetry,
      onAttempt,
    );
    viaProxy = viaProxy || repair.viaProxy;
    usage = repair.usage ?? usage;
    parsed = parseBatchPayload(repair.text);
  }
  if (!parsed.ok) throw new Error(parsed.error);
  return { facts: parsed.value.facts, convs: parsed.value.convs, viaProxy, usage };
}

function verifyRequest(facts: Fact[]): CompleteRequest {
  return {
    system: VERIFY_SYSTEM,
    user: JSON.stringify({ facts }),
    schemaName: 'verify',
    maxOutputTokens: 4000,
  };
}

async function writeNarrative(
  input: RunInput,
  facts: Fact[],
  topics: { c: string; topic: string }[],
  sleep: (ms: number) => Promise<void>,
  onRetry?: (info: { attempt: number; waitMs: number; status: number }) => void,
  onAttempt?: (attempt: number) => void,
): Promise<{ narrative: NarrativeDraft | null; status: NarrativeStatus; viaProxy: boolean; reason?: string }> {
  if (topics.length === 0 && facts.length === 0) {
    return {
      narrative: null,
      status: 'failed',
      viaProxy: false,
      reason: 'The write-up did not run because no conversations were read.',
    };
  }
  const grok = input.model?.provider === 'xai' || /grok/i.test(input.model?.id ?? '');
  const quick = input.depth === 'quick';
  const request: CompleteRequest = {
    system: NARRATIVE_SYSTEM,
    user: compactCoverInput(topics, facts.slice(0, quick ? 24 : 80)),
    schemaName: 'narrative',
    maxOutputTokens: grok ? 8192 : quick ? 800 : 2000,
  };
  let viaProxy = false;
  try {
    const first = await completeWithRetry(() => input.adapter.complete(request), sleep, onRetry, onAttempt);
    viaProxy = first.viaProxy;
    if (!first.text.trim()) {
      return {
        narrative: null,
        status: 'failed-provider',
        viaProxy,
        reason: first.emptyBecauseLength || first.finishReason === 'length'
          ? 'The write-up came back empty (the model used its whole output budget).'
          : 'The write-up came back empty or was not valid JSON.',
      };
    }
    let parsed = parseNarrativePayload(first.text);
    if (parsed.ok && !toneOk(parsed.value.cover)) {
      const retry = await completeWithRetry(
        () => input.adapter.complete({
          ...request,
          user: `${request.user}\nRewrite the cover in plainer language. No insults. Under 700 characters. JSON only.`,
        }),
        sleep,
        onRetry,
        onAttempt,
      );
      viaProxy = viaProxy || retry.viaProxy;
      const second = parseNarrativePayload(retry.text);
      if (second.ok && toneOk(second.value.cover)) parsed = second;
      else parsed = { ok: false, error: 'tone' };
    }
    if (!parsed.ok) {
      return {
        narrative: null,
        status: 'failed-provider',
        viaProxy,
        reason: first.finishReason === 'length'
          ? 'The write-up was cut off because the model used its whole output budget.'
          : parsed.error === 'tone'
            ? 'The write-up was unusable, so it was not kept.'
            : 'The write-up came back empty or was not valid JSON.',
      };
    }
    return {
      narrative: parsed.value,
      status: 'written',
      viaProxy,
    };
  } catch (error) {
    if (error instanceof ProviderRequestError && (error.kind === 'auth' || error.kind === 'cors')) throw error;
    const reason = error instanceof ProviderRequestError && error.kind === 'timeout'
      ? error.message
      : error instanceof ProviderRequestError && error.kind === 'rate'
        ? 'The provider kept rate-limiting (429) during the write-up. Wait a few minutes, or check the provider quota, then try again.'
        : error instanceof ProviderRequestError && error.kind === 'server'
          ? `The provider was busy (${error.status || 503}) during the write-up. Wait a few minutes and try again.`
          : 'The write-up step failed before a cover was saved.';
    return { narrative: null, status: 'failed-provider', viaProxy, reason };
  }
}

export function packPreview(conversation: NormalizedConversation, depth: DepthId): string {
  return packConversation(conversation, depth).text;
}

export function budgetFromFields(maxTokens: string, maxDollars: string): RunBudget {
  const dollars = maxDollars.trim() ? Number(maxDollars) : undefined;
  const tokens = maxTokens.trim() ? Number(maxTokens) : undefined;
  return {
    maxDollars: dollars != null && Number.isFinite(dollars) ? dollars : undefined,
    maxTokens: tokens != null && Number.isFinite(tokens) ? tokens : undefined,
  };
}

export function budgetBlocks(budget: RunBudget | undefined, dollars: number, tokens: number): boolean {
  if (!budget) return false;
  if (budget.maxDollars != null && Number.isFinite(budget.maxDollars) && dollars > budget.maxDollars + 1e-9) return true;
  if (budget.maxTokens != null && Number.isFinite(budget.maxTokens) && tokens > budget.maxTokens) return true;
  return false;
}

function citedFacts(file: CaseFile): Fact[] {
  const rows: Fact[] = [];
  const add = (kind: Fact['k'], items: Array<{ v: string; quote: string | null; ev: string[]; first: string | null }>) => {
    for (const item of items) {
      if (!item.v.trim()) continue;
      rows.push({ c: item.ev[0] || 'case', k: kind, v: item.v, q: item.quote, t: item.first, d: null });
    }
  };
  add('person', file.people);
  add('interest', file.interests);
  add('belief', file.beliefs);
  add('worry', file.worries);
  add('health', file.health);
  add('money', file.money);
  add('decision', file.decisions);
  add('loop', file.open_loops);
  return rows.slice(0, 80);
}

/** Re-run only the cover step and fold it into the report already on screen. */
export async function retryNarrative(input: {
  file: CaseFile;
  adapter: Adapter;
  sleep?: (ms: number) => Promise<void>;
  onProgress?: (progress: RunProgress) => void;
}): Promise<CaseFile> {
  const sleep = input.sleep ?? defaultSleep;
  let routeLine = `Sending directly to ${providerDisplayName(input.file.model.provider)}.`;
  const snapshot = (message: string): RunProgress => ({
    phase: 'narrative',
    completedBatches: 0,
    totalBatches: 1,
    read: input.file.coverage.read,
    planned: input.file.coverage.planned,
    viaProxy: false,
    routeKnown: false,
    routeLine,
    message,
  });
  if (input.file.coverage.read < 1 || unreadCount(input.file) > 0) {
    input.onProgress?.(snapshot('The write-up did not run because conversations in this plan are still unread.'));
    return input.file;
  }
  const onRetry = (info: { attempt: number; waitMs: number; status: number }) => {
    input.onProgress?.(snapshot(providerWaitMessage(info.status, info.waitMs, info.attempt)));
  };
  const onAttempt = (attempt: number) => {
    input.onProgress?.(snapshot(`Writing the cover again (attempt ${attempt} of 5).`));
  };
  input.onProgress?.(snapshot('Writing the short cover.'));
  const topics = input.file.coverage.topics.filter((topic) => topic.c !== 'case' || topic.topic !== 'this read');
  const written = await writeNarrative(
    { adapter: input.adapter, depth: input.file.model.depth, model: { provider: input.file.model.provider, id: input.file.model.id, inputPricePerMillion: 0, outputPricePerMillion: 0, contextWindow: 128_000 } } as RunInput,
    citedFacts(input.file),
    topics,
    sleep,
    onRetry,
    onAttempt,
  );
  if (written.viaProxy) {
    routeLine = 'Calls are going through the pass-through.';
    input.onProgress?.(snapshot('Writing the short cover.'));
  }
  return applyNarrativeResult(input.file, written.narrative, written.status, written.reason);
}

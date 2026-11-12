import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { Adapter, CompleteRequest } from './adapters.ts';
import { buildCaseFile, type CaseFile, type NarrativeStatus } from './merge.ts';
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
import { selectConversations, type DepthId } from './depth.ts';
import type { LocalReport } from './localPass.ts';
import { toneOk } from './checks.ts';
import { completeWithRetry, ProviderRequestError } from './transport.ts';

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
  sleep?: (ms: number) => Promise<void>;
  isPaused?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (progress: RunProgress) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  const selection = selectConversations(input.local, input.depth, input.quickFraction ?? 0.1);
  const byId = new Map(input.conversations.map((conversation) => [conversation.id, conversation]));
  const already = new Set(input.alreadyReadIds ?? []);
  const pendingIds = selection.chosenIds.filter((id) => !already.has(id));
  const queue = packBatches(
    pendingIds.map((id) => byId.get(id)).filter((item): item is NormalizedConversation => Boolean(item)),
    input.depth,
    input.model.contextWindow || 32_000,
  );
  const facts: Fact[] = [];
  const topics: { c: string; topic: string }[] = [];
  for (const id of selection.chosenIds) {
    if (already.has(id)) topics.push({ c: id, topic: 'resumed' });
  }
  const failed = new Set<string>();
  let viaProxy = false;
  let spentDollars = 0;
  let spentTokens = 0;
  let completed = 0;
  let stopReason: string | undefined;
  const totalAtStart = queue.length;

  const progress = (phase: RunProgress['phase'], message: string): RunProgress => ({
    phase,
    completedBatches: completed,
    totalBatches: Math.max(totalAtStart, completed + queue.length),
    read: topics.length,
    planned: selection.chosenIds.length,
    viaProxy,
    message,
  });

  input.onProgress?.(progress('packing', 'Packing the chats that this depth will send.'));

  while (queue.length) {
    if (input.signal?.aborted) {
      stopReason = 'stopped';
      break;
    }
    await waitIfPaused(input, sleep, () => progress('paused', 'Paused.'));
    if (input.signal?.aborted) {
      stopReason = 'stopped';
      break;
    }
    const batch = queue[0];
    const estimate = batchEstimate(batch, input.depth, input.model);
    if (wouldExceed(spentDollars, spentTokens, estimate, input.budget)) {
      stopReason = 'budget';
      break;
    }
    input.onProgress?.(progress('batch', `Reading batch ${completed + 1} of ${completed + queue.length}.`));
    try {
      const extracted = await extractBatch(input, batch, sleep);
      if (extracted.viaProxy) viaProxy = true;
      const known = new Set(batch.ids);
      for (const fact of extracted.facts) {
        if (known.has(fact.c)) facts.push(fact);
      }
      const returned = new Set(extracted.convs.map((item) => item.c));
      for (const conv of extracted.convs) {
        if (known.has(conv.c)) topics.push(conv);
      }
      const missing = batch.ids.filter((id) => !returned.has(id));
      spentDollars += extracted.usage ? dollars(extracted.usage.input, extracted.usage.output, input.model) : estimate.dollars;
      spentTokens += extracted.usage ? extracted.usage.input + extracted.usage.output : estimate.inputTokens + estimate.outputTokens;
      queue.shift();
      completed += 1;
      if (missing.length && !batch.wasRetry) {
        const again = missing.map((id) => byId.get(id)).filter((item): item is NormalizedConversation => Boolean(item));
        const [repacked] = packBatches(again, input.depth, input.model.contextWindow || 32_000);
        if (repacked) queue.unshift({ ...repacked, wasRetry: true });
      } else {
        missing.forEach((id) => failed.add(id));
      }
    } catch (error) {
      if (error instanceof ProviderRequestError && error.kind === 'safety') {
        queue.shift();
        batch.ids.forEach((id) => failed.add(id));
        completed += 1;
        stopReason = stopReason ?? 'safety';
        continue;
      }
      if (batch.ids.length > 1 && !(error instanceof ProviderRequestError && (error.kind === 'auth' || error.kind === 'cors'))) {
        queue.shift();
        const mid = Math.ceil(batch.ids.length / 2);
        const left = batch.ids.slice(0, mid).map((id) => byId.get(id)).filter((item): item is NormalizedConversation => Boolean(item));
        const right = batch.ids.slice(mid).map((id) => byId.get(id)).filter((item): item is NormalizedConversation => Boolean(item));
        const pieces = [...packBatches(left, input.depth, input.model.contextWindow || 32_000), ...packBatches(right, input.depth, input.model.contextWindow || 32_000)];
        queue.unshift(...pieces);
        continue;
      }
      if (error instanceof ProviderRequestError && (error.kind === 'auth' || error.kind === 'cors')) throw error;
      queue.shift();
      batch.ids.forEach((id) => failed.add(id));
      completed += 1;
      stopReason = stopReason ?? 'batch-failed';
    }
  }

  let narrativeStatus: NarrativeStatus = input.depth === 'quick' ? 'not-in-depth' : 'templated';
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

  if (input.depth !== 'quick' && selection.chosenIds.length > 0 && !extractIncomplete && !stopReason) {
    const narrativeEstimate = { dollars: dollars(30_000, 16_000, input.model), inputTokens: 30_000, outputTokens: 16_000 };
    if (wouldExceed(spentDollars, spentTokens, narrativeEstimate, input.budget)) {
      narrativeStatus = 'skipped-budget';
      stopReason = 'budget';
    } else {
      input.onProgress?.(progress('narrative', 'Writing the short cover.'));
      const written = await writeNarrative(input, facts, topics, sleep);
      narrative = written.narrative;
      narrativeStatus = written.status;
      if (written.viaProxy) viaProxy = true;
    }
  } else if (input.depth !== 'quick' && (stopReason === 'budget' || extractIncomplete)) {
    narrativeStatus = 'skipped-budget';
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

async function extractBatch(input: RunInput, batch: PackedBatch, sleep: (ms: number) => Promise<void>) {
  const request: CompleteRequest = {
    system: input.depth === 'quick' ? `${EXTRACTION_SYSTEM}\n${QUICK_ADDENDUM}` : EXTRACTION_SYSTEM,
    user: batch.text,
    schemaName: 'batch_extract',
    maxOutputTokens: 8000,
  };
  const first = await completeWithRetry(() => input.adapter.complete(request), sleep);
  let parsed = parseBatchPayload(first.text);
  let viaProxy = first.viaProxy;
  let usage = first.usage;
  if (!parsed.ok) {
    const repair = await completeWithRetry(
      () => input.adapter.complete({ ...request, user: buildRepairPrompt(first.text, parsed.ok ? '' : parsed.error) }),
      sleep,
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
): Promise<{ narrative: NarrativeDraft | null; status: NarrativeStatus; viaProxy: boolean }> {
  const request: CompleteRequest = {
    system: NARRATIVE_SYSTEM,
    user: JSON.stringify({ topics, facts: facts.slice(0, 80) }),
    schemaName: 'narrative',
    maxOutputTokens: 2000,
  };
  let viaProxy = false;
  try {
    const first = await completeWithRetry(() => input.adapter.complete(request), sleep);
    viaProxy = first.viaProxy;
    let parsed = parseNarrativePayload(first.text);
    if (parsed.ok && !toneOk(parsed.value.cover)) {
      const retry = await completeWithRetry(
        () => input.adapter.complete({
          ...request,
          user: `${request.user}\nRewrite the cover in plainer language. No insults. Under 700 characters. JSON only.`,
        }),
        sleep,
      );
      viaProxy = viaProxy || retry.viaProxy;
      const second = parseNarrativePayload(retry.text);
      if (second.ok && toneOk(second.value.cover)) parsed = second;
      else parsed = { ok: false, error: 'tone' };
    }
    if (!parsed.ok) return { narrative: null, status: 'templated', viaProxy };
    return {
      narrative: parsed.value,
      status: 'written',
      viaProxy,
    };
  } catch (error) {
    if (error instanceof ProviderRequestError && (error.kind === 'auth' || error.kind === 'cors')) throw error;
    return { narrative: null, status: 'templated', viaProxy };
  }
}

export function packPreview(conversation: NormalizedConversation, depth: DepthId): string {
  return packConversation(conversation, depth).text;
}

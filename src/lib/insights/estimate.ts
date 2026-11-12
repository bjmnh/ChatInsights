import { batchSizeFor, type DepthId } from './depth.ts';

export const PROMPT_OVERHEAD_TOKENS = 3000;
export const NARRATIVE_INPUT_TOKENS = 30_000;
export const NARRATIVE_OUTPUT_TOKENS = 16_000;
export const COST_CUSHION = 1.2;

export interface EstimateInput {
  depth: DepthId;
  conversationCount: number;
  userTokens: number;
  fullTokens: number;
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  pacing?: 'slow' | 'faster';
}

export interface Estimate {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  batchSize: number;
  costBeforeCushion: number;
  cost: number;
  minutesLow: number;
  minutesHigh: number;
}

export function estimateRead(input: EstimateInput): Estimate {
  const count = Math.max(0, input.conversationCount);
  const userTokens = Math.max(0, input.userTokens);
  const sourceTokens = input.depth === 'forensic' ? Math.max(0, input.fullTokens) : userTokens;
  const average = count ? sourceTokens / count : 0;
  const batchSize = batchSizeFor(input.depth, input.contextWindow, average || 1);
  const extractCalls = count ? Math.ceil(count / batchSize) : 0;
  const outputRatio = input.depth === 'quick' ? 0.08 : 0.15;
  let inputTokens = sourceTokens + extractCalls * PROMPT_OVERHEAD_TOKENS;
  let outputTokens = Math.round(userTokens * outputRatio);
  let calls = extractCalls;
  if (input.depth !== 'quick' && count > 0) {
    inputTokens += NARRATIVE_INPUT_TOKENS;
    outputTokens += NARRATIVE_OUTPUT_TOKENS;
    calls += 1;
  }
  if (input.depth === 'forensic' && count > 0) {
    // One verification pass, scaled to the user text. The 0.07 / 194/3000 factors
    // land the published 2,000-chat example on the design table.
    inputTokens += Math.round(userTokens * 0.07);
    outputTokens += Math.round(userTokens * (194 / 3000));
    calls += 1;
  }
  const costBeforeCushion =
    (inputTokens / 1_000_000) * input.inputPricePerMillion +
    (outputTokens / 1_000_000) * input.outputPricePerMillion;
  const pacing = input.pacing ?? 'slow';
  const parallel = pacing === 'faster' ? 3 : 1;
  const secondsEach = pacing === 'faster' ? 4 : 12;
  const totalSeconds = calls === 0 ? 0 : (calls / parallel) * secondsEach;
  return {
    inputTokens,
    outputTokens,
    calls,
    batchSize,
    costBeforeCushion,
    cost: costBeforeCushion * COST_CUSHION,
    minutesLow: (totalSeconds * 0.7) / 60,
    minutesHigh: (totalSeconds * 1.8) / 60,
  };
}

/** The design doc's worked example: 2,000 chats, 1,500 user tokens, 6,000 full tokens, 40% flagged. */
export function estimateWorkedExample(
  depth: DepthId,
  prices: { input: number; output: number },
): Estimate {
  const conversations = 2000;
  const fraction = depth === 'quick' ? 0.1 : depth === 'standard' ? 0.4 : 1;
  const count = Math.round(conversations * fraction);
  return estimateRead({
    depth,
    conversationCount: count,
    userTokens: count * 1500,
    fullTokens: count * 6000,
    contextWindow: 1_000_000,
    inputPricePerMillion: prices.input,
    outputPricePerMillion: prices.output,
    pacing: 'slow',
  });
}

export function formatCost(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value < 0.01) return '< $0.01';
  return `$${value.toFixed(2)}`;
}

export function formatMinutes(low: number, high: number): string {
  if (high <= 0) return 'No model calls';
  if (high < 1) return 'under a minute';
  const start = Math.max(1, Math.round(low));
  const end = Math.max(start, Math.round(high));
  if (start === end) return `about ${start} minute${start === 1 ? '' : 's'}`;
  return `about ${start}–${end} minutes`;
}

export function formatTokens(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(2)}M`;
}

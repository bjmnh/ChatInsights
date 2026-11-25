import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { CompleteRequest, CompleteResult } from './adapters.ts';
import type { CostLedger } from './ledger.ts';
import { combineLedgers } from './ledger.ts';
import type { CaseFile, Cited } from './merge.ts';
import { packConversation } from './pack.ts';
import { extractJson } from './schema.ts';
import { estimateTokens } from './tokens.ts';

export const NOT_IN_CASE_FILE = 'Not in your case file';

export const ASK_SYSTEM = `You answer one question about the reader's own case file. Use only the numbered facts. If those facts do not support an answer, set supported to false and answer to "Not in your case file". Do not guess, diagnose, or add knowledge from outside the facts. A supported answer must list the fact numbers it used. Output JSON only: {"supported":boolean,"answer":string,"factIds":number[]}.`;

export interface CompactFact {
  n: number;
  kind: string;
  text: string;
  quote: string | null;
  ev: string[];
  month: string | null;
}

export interface AskBudget {
  maxTokens?: number;
  maxDollars?: number;
}

function monthOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{2}/);
  return match ? match[0] : null;
}

function pushFact(rows: CompactFact[], kind: string, text: string, quote: string | null, ev: string[], month: string | null) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;
  rows.push({
    n: rows.length + 1,
    kind,
    text: clean.slice(0, 180),
    quote: quote?.replace(/\s+/g, ' ').trim().slice(0, 120) || null,
    ev: ev.filter(Boolean).slice(0, 3),
    month,
  });
}

function fromCited(rows: CompactFact[], kind: string, item: Cited) {
  pushFact(rows, kind, item.v, item.quote, item.ev, monthOf(item.last) || monthOf(item.first));
}

/** Short facts only. Raw chats are not included. */
export function compactFacts(file: CaseFile): CompactFact[] {
  const rows: CompactFact[] = [];
  for (const person of file.people) {
    pushFact(rows, 'person', person.relationship ? `${person.name} (${person.relationship})` : person.name, person.quote, person.ev, monthOf(person.last) || monthOf(person.first));
  }
  for (const item of file.decisions) {
    const text = item.reversed ? `${item.question}: ${item.v} (earlier: ${item.reversed.v})` : `${item.question}: ${item.v}`;
    pushFact(rows, 'decision', text, item.quote, [...item.ev, ...(item.reversed?.ev ?? [])], monthOf(item.last) || monthOf(item.reversed?.date) || monthOf(item.first));
  }
  for (const item of file.projects) fromCited(rows, 'project', item);
  for (const item of file.open_loops) fromCited(rows, 'loop', item);
  for (const item of file.worries) fromCited(rows, 'worry', item);
  for (const item of file.interests) fromCited(rows, 'interest', item);
  for (const item of file.beliefs) fromCited(rows, 'belief', item);
  for (const item of file.money) fromCited(rows, 'money', item);
  for (const item of file.health) fromCited(rows, 'health', item);
  for (const item of file.places) fromCited(rows, 'place', item);
  for (const topic of file.coverage.topics) pushFact(rows, 'topic', topic.topic, null, [topic.c], null);
  return rows.slice(0, 80);
}

export function retrieveChats(conversations: NormalizedConversation[], question: string, limit = 3): string {
  const terms = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3);
  if (!terms.length) return '';
  const ranked = conversations.map((conversation) => {
    const text = conversation.messages.filter((message) => message.role === 'user').map((message) => message.text).join('\n').toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    return { conversation, score };
  }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score || a.conversation.id.localeCompare(b.conversation.id));
  return ranked.slice(0, limit).map((row) => packConversation(row.conversation, 'deep').text).join('\n\n');
}

export function askUserPayload(facts: CompactFact[], question: string, chats = ''): string {
  return JSON.stringify({
    question: question.trim(),
    facts: facts.map((fact) => ({ n: fact.n, kind: fact.kind, text: fact.text, quote: fact.quote, month: fact.month, ev: fact.ev })),
    ...(chats ? { chats } : {}),
  });
}

export function askEstimate(payload: string, prices: { input: number; output: number }): { tokens: number; dollars: number } {
  const input = estimateTokens(payload) + estimateTokens(ASK_SYSTEM);
  const output = 400;
  return {
    tokens: input + output,
    dollars: (input / 1_000_000) * prices.input + (output / 1_000_000) * prices.output,
  };
}

export function questionFitsBudget(
  spent: { tokens: number; dollars: number },
  estimate: { tokens: number; dollars: number },
  budget?: AskBudget,
): string | null {
  if (budget?.maxTokens != null && spent.tokens + estimate.tokens > budget.maxTokens) {
    return `This question would pass the token cap (${budget.maxTokens.toLocaleString()} tokens).`;
  }
  if (budget?.maxDollars != null && spent.dollars + estimate.dollars > budget.maxDollars + 1e-9) {
    return `This question would pass the dollar cap ($${budget.maxDollars}).`;
  }
  return null;
}

export function parseAskResponse(text: string, facts: CompactFact[]): { supported: boolean; answer: string; facts: CompactFact[] } {
  let parsed: { supported?: unknown; answer?: unknown; factIds?: unknown } | null = null;
  try {
    parsed = extractJson(text) as { supported?: unknown; answer?: unknown; factIds?: unknown };
  } catch {
    parsed = null;
  }
  const ids = Array.isArray(parsed?.factIds) ? parsed.factIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
  const used = facts.filter((fact) => ids.includes(fact.n));
  const supported = parsed?.supported === true && used.length > 0;
  const answer = typeof parsed?.answer === 'string' ? parsed.answer.trim() : '';
  if (!supported || !answer || answer === NOT_IN_CASE_FILE) {
    return { supported: false, answer: NOT_IN_CASE_FILE, facts: [] };
  }
  return { supported: true, answer, facts: used };
}

export interface AskTurn {
  question: string;
  answer: string;
  supported: boolean;
  ev: { id: string; quote: string | null }[];
  dollars: number;
  tokens: number;
}

export function rememberQuestions(history: AskTurn[], turn: AskTurn): AskTurn[] {
  const next = [...history, turn].slice(-20).map((item) => ({
    question: item.question,
    answer: item.answer,
    supported: item.supported,
    ev: item.ev.map((chip) => ({ id: chip.id, quote: chip.quote })),
    dollars: item.dollars,
    tokens: item.tokens,
  }));
  return next;
}

export async function askCaseFile(input: {
  file: CaseFile;
  question: string;
  conversations?: NormalizedConversation[];
  searchChats?: boolean;
  prices: { input: number; output: number };
  budget?: AskBudget;
  complete: (request: CompleteRequest) => Promise<CompleteResult>;
}): Promise<{ turn: AskTurn; ledger: CostLedger | undefined; blocked: string | null; called: boolean }> {
  const facts = compactFacts(input.file);
  const chats = input.searchChats ? retrieveChats(input.conversations ?? [], input.question) : '';
  const payload = askUserPayload(facts, input.question, chats);
  const estimate = askEstimate(payload, input.prices);
  const spent = { tokens: input.file.ledger?.spentTokens ?? 0, dollars: input.file.ledger?.spentDollars ?? 0 };
  const blocked = questionFitsBudget(spent, estimate, input.budget);
  if (blocked || !facts.length) {
    const turn: AskTurn = { question: input.question.trim(), answer: blocked || NOT_IN_CASE_FILE, supported: false, ev: [], dollars: 0, tokens: 0 };
    return { turn, ledger: input.file.ledger, blocked, called: false };
  }
  const result = await input.complete({ system: ASK_SYSTEM, user: payload, schemaName: 'ask', maxOutputTokens: 800 });
  const parsed = parseAskResponse(result.text, facts);
  const tokens = result.usage ? result.usage.input + result.usage.output : estimate.tokens;
  const dollars = result.usage
    ? (result.usage.input / 1_000_000) * input.prices.input + (result.usage.output / 1_000_000) * input.prices.output
    : estimate.dollars;
  const turn: AskTurn = {
    question: input.question.trim(),
    answer: parsed.answer,
    supported: parsed.supported,
    ev: parsed.facts.flatMap((fact) => fact.ev.map((id) => ({ id, quote: fact.quote }))),
    dollars,
    tokens,
  };
  const ledger = combineLedgers(input.file.ledger, {
    estimateTokens: estimate.tokens,
    estimateDollars: estimate.dollars,
    spentTokens: tokens,
    spentDollars: dollars,
  });
  if (ledger?.runs?.length) ledger.runs[ledger.runs.length - 1] = { ...ledger.runs[ledger.runs.length - 1], label: 'Question' };
  return { turn, ledger, blocked: null, called: true };
}

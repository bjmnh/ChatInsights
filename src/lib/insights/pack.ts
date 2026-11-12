import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { DepthId } from './depth.ts';
import { batchSizeFor } from './depth.ts';
import { luhnOk } from './localPass.ts';
import { estimateTokens } from './tokens.ts';

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:^|\D)(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;

export function maskSensitive(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE, (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) return match;
      const lead = match.match(/^\D/)?.[0] ?? '';
      return `${lead}[phone]`;
    })
    .replace(CARD, (match) => (luhnOk(match) ? '[card]' : match));
}

export function stubLongPaste(text: string): string {
  const withoutFence = text.replace(/```[\s\S]{400,}?```/g, (block) => `[code omitted, ${block.length} chars]`);
  return withoutFence
    .split('\n')
    .map((line) => (line.length > 500 ? `${line.slice(0, 180)} … [paste omitted, ${line.length} chars]` : line))
    .join('\n');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export interface PackedConversation {
  id: string;
  text: string;
  tokens: number;
  userTokens: number;
}

export function packConversation(conversation: NormalizedConversation, depth: DepthId): PackedConversation {
  const lines = [`<conversation id="${escapeAttr(conversation.id)}" title="${escapeAttr(conversation.title)}">`];
  const userParts: string[] = [];
  for (const message of conversation.messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const prepared = maskSensitive(stubLongPaste(message.text)).trim();
    if (!prepared) continue;
    if (message.role === 'user') {
      lines.push(`USER: ${prepared}`);
      userParts.push(prepared);
      continue;
    }
    if (depth === 'forensic') lines.push(`ASSISTANT: ${prepared}`);
    else if (depth === 'deep') lines.push(`ASSISTANT: ${prepared.split('\n')[0].slice(0, 160)}`);
  }
  lines.push('</conversation>');
  const text = lines.join('\n');
  return {
    id: conversation.id,
    text,
    tokens: estimateTokens(text),
    userTokens: estimateTokens(userParts.join('\n')),
  };
}

export interface PackedBatch {
  ids: string[];
  text: string;
  tokens: number;
  userTokens: number;
  wasRetry?: boolean;
}

export function packBatches(
  conversations: NormalizedConversation[],
  depth: DepthId,
  contextWindow: number,
): PackedBatch[] {
  const packed = conversations.map((conversation) => packConversation(conversation, depth));
  if (!packed.length) return [];
  const average = packed.reduce((sum, item) => sum + item.tokens, 0) / packed.length;
  const size = batchSizeFor(depth, contextWindow, average);
  const tokenLimit = Math.max(500, Math.floor(contextWindow * 0.6) - 3000);
  const batches: PackedBatch[] = [];
  let current: PackedConversation[] = [];
  const flush = () => {
    if (!current.length) return;
    batches.push({
      ids: current.map((item) => item.id),
      text: current.map((item) => item.text).join('\n'),
      tokens: current.reduce((sum, item) => sum + item.tokens, 0),
      userTokens: current.reduce((sum, item) => sum + item.userTokens, 0),
    });
    current = [];
  };
  for (const item of packed) {
    const nextTokens = current.reduce((sum, entry) => sum + entry.tokens, 0) + item.tokens;
    if (current.length >= size || (current.length > 0 && nextTokens > tokenLimit)) flush();
    current.push(item);
  }
  flush();
  return batches;
}

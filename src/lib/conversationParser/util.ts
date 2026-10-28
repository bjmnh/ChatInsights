import type { ConversationSourceFormat, DraftMessage, MessageRole, NormalizedConversation, NormalizedMessage } from './types.ts';

const USER_ROLES = new Set(['user', 'human', 'you', 'prompter', 'customer']);
const ASSISTANT_ROLES = new Set([
  'assistant', 'ai', 'model', 'bot', 'gpt', 'chatgpt', 'claude', 'gemini', 'bard',
  'grok', 'copilot', 'perplexity', 'mistral', 'deepseek', 'cursor', 'agent',
]);
const SYSTEM_ROLES = new Set(['system', 'developer']);
const TOOL_ROLES = new Set(['tool', 'function', 'function_call', 'tool_result']);

export function normalizeRole(raw: unknown): MessageRole {
  const value = typeof raw === 'object' && raw !== null && 'role' in raw
    ? (raw as { role?: unknown }).role
    : raw;
  if (typeof value !== 'string') return 'unknown';
  const role = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (USER_ROLES.has(role)) return 'user';
  if (ASSISTANT_ROLES.has(role)) return 'assistant';
  if (SYSTEM_ROLES.has(role)) return 'system';
  if (TOOL_ROLES.has(role)) return 'tool';
  return 'unknown';
}

export function toIsoTimestamp(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : null;
    if (ms == null) return null;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return toIsoTimestamp(Number(trimmed));
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

export function extractTextContent(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((part) => extractTextContent(part)).filter(Boolean).join('\n').trim();
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim();
    if (typeof obj.content === 'string' && obj.content.trim()) return obj.content.trim();
    if (Array.isArray(obj.parts)) return extractTextContent(obj.parts);
    if (Array.isArray(obj.content)) return extractTextContent(obj.content);
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
    if (typeof obj.body === 'string' && obj.body.trim()) return obj.body.trim();
    if (typeof obj.value === 'string' && obj.value.trim()) return obj.value.trim();
  }
  return '';
}

export function decodeUtf8(data: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
  return text.replace(/^\uFEFF/, '');
}

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || '';
  const match = base.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'Conversation';
  const noExt = base.replace(/\.[^.]+$/, '');
  const cleaned = noExt.replace(/[_-]+/g, ' ').trim();
  return cleaned || 'Conversation';
}

function sortMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const aTime = a.message.timestamp ? Date.parse(a.message.timestamp) : NaN;
      const bTime = b.message.timestamp ? Date.parse(b.message.timestamp) : NaN;
      const aMissing = Number.isNaN(aTime);
      const bMissing = Number.isNaN(bTime);
      if (aMissing && bMissing) return a.index - b.index;
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (aTime === bTime) return a.index - b.index;
      return aTime - bTime;
    })
    .map((entry) => entry.message);
}

export function finalizeConversation(input: {
  id?: string;
  title?: string;
  createdAt?: string | null;
  messages: DraftMessage[];
  sourceFormat: ConversationSourceFormat;
  index: number;
}): NormalizedConversation | null {
  const messages = sortMessages(
    input.messages
      .map((message) => ({
        role: message.role,
        text: message.text.replace(/\r\n/g, '\n').trim(),
        timestamp: message.timestamp ?? null,
      }))
      .filter((message) => message.text.length > 0),
  );
  if (!messages.length) return null;

  const createdAt = input.createdAt ?? messages.find((message) => message.timestamp)?.timestamp ?? null;
  const firstUser = messages.find((message) => message.role === 'user')?.text;
  const title = input.title?.trim()
    || (firstUser ? firstUser.replace(/\s+/g, ' ').slice(0, 80) : '')
    || `Conversation ${input.index + 1}`;

  return {
    id: input.id?.trim() || `${input.sourceFormat}-${input.index + 1}`,
    title,
    createdAt,
    messages,
    sourceFormat: input.sourceFormat,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readLooseMessage(value: unknown): DraftMessage | null {
  if (!isRecord(value)) return null;
  const roleRaw = value.role ?? value.author ?? value.sender ?? value.speaker ?? value.from ?? value.sender_type;
  const role = normalizeRole(roleRaw);
  let text = '';
  if ('content' in value) text = extractTextContent(value.content);
  if (!text && 'text' in value) text = extractTextContent(value.text);
  if (!text && 'message' in value) text = extractTextContent(value.message);
  if (!text && 'parts' in value) text = extractTextContent(value.parts);
  if (!text && 'body' in value) text = extractTextContent(value.body);
  if (!text) return null;
  return {
    role,
    text,
    timestamp: toIsoTimestamp(value.timestamp ?? value.created_at ?? value.create_time ?? value.createdAt ?? value.time ?? value.date),
  };
}

export function isLooseMessage(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if ('messages' in value || 'mapping' in value || 'chat_messages' in value || 'conversation_items' in value) return false;
  const roleRaw = value.role ?? value.author ?? value.sender ?? value.speaker ?? value.from ?? value.sender_type;
  if (typeof roleRaw !== 'string' && !isRecord(roleRaw)) return false;
  return Boolean(readLooseMessage(value));
}

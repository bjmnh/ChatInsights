import { ConversationParseError, unsupportedFormatMessage } from './errors.ts';
import type { ConversationSourceFormat, DraftMessage, NormalizedConversation, ParseResult } from './types.ts';
import {
  extensionOf,
  extractTextContent,
  finalizeConversation,
  isLooseMessage,
  isRecord,
  normalizeRole,
  readLooseMessage,
  titleFromFilename,
  toIsoTimestamp,
} from './util.ts';
import { isZipBytes, unzipArchive } from './zip.ts';

const ENVELOPE_KEYS = ['conversations', 'chats', 'data', 'items', 'threads', 'history', 'grok_conversations'];
const MAX_ZIP_ENTRIES = 200;
const MAX_ENTRY_BYTES = 80 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED = 150 * 1024 * 1024;
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.mp4', '.wav', '.pdf', '.ico', '.woff', '.woff2', '.ttf',
]);

const ROLE_HEADERS = ['role', 'author', 'sender', 'speaker', 'from', 'participant'];
const TEXT_HEADERS = ['content', 'text', 'message', 'body', 'prompt'];
const TIME_HEADERS = ['timestamp', 'time', 'created_at', 'create_time', 'date', 'datetime', 'createdat'];
const ID_HEADERS = ['conversation_id', 'conversationid', 'conversation', 'chat_id', 'chatid', 'thread_id', 'threadid'];
const TITLE_HEADERS = ['title', 'conversation_title', 'name', 'chat_title'];

const ROLE_NAMES = 'user|human|you|assistant|ai|model|bot|system|tool|grok|claude|gemini|chatgpt|copilot|perplexity|mistral|deepseek|cursor|bard|agent';
const ROLE_LINE = new RegExp(`^(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*(${ROLE_NAMES})\\s*(?:\\*\\*|__)?\\s*[:：]\\s*(?:\\*\\*|__)?\\s*(.*)$`, 'i');
const ROLE_HEADING = new RegExp(`^#{1,6}\\s*(${ROLE_NAMES})\\s*$`, 'i');

function keepMessages(messages: Array<DraftMessage | null>): DraftMessage[] {
  const kept: DraftMessage[] = [];
  for (const message of messages) {
    if (message && message.text.trim()) kept.push(message);
  }
  return kept;
}

function uniqueFormats(conversations: NormalizedConversation[]): ConversationSourceFormat[] {
  return [...new Set(conversations.map((conversation) => conversation.sourceFormat))];
}

function resultFrom(conversations: NormalizedConversation[], warnings: string[] = []): ParseResult {
  const formatsFound = uniqueFormats(conversations);
  return {
    conversations,
    format: formatsFound.length === 1 ? formatsFound[0] : 'mixed',
    formatsFound,
    warnings,
  };
}

function isNormalizedMessage(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.role === 'string'
    && typeof value.text === 'string'
    && !('content' in value)
    && !('author' in value)
    && !('parts' in value)
    && !('mapping' in value);
}

function isNormalizedConversation(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.messages) || value.messages.length === 0) return false;
  if ('mapping' in value || 'chat_messages' in value) return false;
  return value.messages.every(isNormalizedMessage);
}

function tryNormalized(value: unknown): NormalizedConversation[] | null {
  const list = Array.isArray(value) ? value : [value];
  if (!list.length || !list.every(isNormalizedConversation)) return null;
  const conversations = list.map((item, index) => {
    const record = item as Record<string, unknown>;
    const source = record.sourceFormat;
    const sourceFormat: ConversationSourceFormat = source === 'chatgpt' || source === 'claude' || source === 'gemini'
      || source === 'grok' || source === 'generic-json' || source === 'jsonl' || source === 'markdown'
      || source === 'csv' || source === 'normalized'
      ? source
      : 'normalized';
    return finalizeConversation({
      id: typeof record.id === 'string' ? record.id : undefined,
      title: typeof record.title === 'string' ? record.title : undefined,
      createdAt: toIsoTimestamp(record.createdAt ?? record.create_time ?? record.created_at),
      messages: (record.messages as unknown[]).map((message) => {
        const draft = message as Record<string, unknown>;
        return {
          role: normalizeRole(draft.role),
          text: String(draft.text),
          timestamp: toIsoTimestamp(draft.timestamp),
        };
      }),
      sourceFormat,
      index,
    });
  }).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function isChatGptConversation(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.mapping)) return false;
  return Object.values(value.mapping).some((node) => isRecord(node) && ('message' in node || 'parent' in node || 'children' in node));
}

function chatgptMessageText(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (isRecord(content) && Array.isArray(content.parts)) return extractTextContent(content.parts);
  return extractTextContent(content);
}

function tryChatgpt(value: unknown): NormalizedConversation[] | null {
  const list = Array.isArray(value) ? value : [value];
  if (!list.length || !list.every(isChatGptConversation)) return null;
  const conversations = list.map((item, index) => {
    const record = item as Record<string, unknown>;
    const mapping = record.mapping as Record<string, unknown>;
    const messages: DraftMessage[] = [];
    for (const node of Object.values(mapping)) {
      if (!isRecord(node) || !isRecord(node.message)) continue;
      const message = node.message;
      const author = isRecord(message.author) ? message.author : undefined;
      const text = chatgptMessageText(message);
      if (!text) continue;
      messages.push({
        role: normalizeRole(author?.role),
        text,
        timestamp: toIsoTimestamp(message.create_time ?? record.create_time),
      });
    }
    return finalizeConversation({
      id: typeof record.id === 'string' ? record.id : typeof record.conversation_id === 'string' ? record.conversation_id : undefined,
      title: typeof record.title === 'string' ? record.title : undefined,
      createdAt: toIsoTimestamp(record.create_time ?? record.created_at),
      messages,
      sourceFormat: 'chatgpt',
      index,
    });
  }).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function isClaudeConversation(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.chat_messages);
}

function tryClaude(value: unknown): NormalizedConversation[] | null {
  const list = Array.isArray(value) ? value : [value];
  if (!list.length || !list.every(isClaudeConversation)) return null;
  const conversations = list.map((item, index) => {
    const record = item as Record<string, unknown>;
    const drafts = (record.chat_messages as unknown[]).map((entry) => {
      if (!isRecord(entry)) return null;
      const text = typeof entry.text === 'string' && entry.text.trim()
        ? entry.text
        : extractTextContent(entry.content);
      return {
        role: normalizeRole(entry.sender ?? entry.role),
        text,
        timestamp: toIsoTimestamp(entry.created_at ?? entry.updated_at ?? entry.timestamp),
      };
    });
    const messages = keepMessages(drafts);
    return finalizeConversation({
      id: typeof record.uuid === 'string' ? record.uuid : typeof record.id === 'string' ? record.id : undefined,
      title: typeof record.name === 'string' ? record.name : typeof record.title === 'string' ? record.title : undefined,
      createdAt: toIsoTimestamp(record.created_at ?? record.create_time),
      messages,
      sourceFormat: 'claude',
      index,
    });
  }).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function isGeminiActivity(value: unknown): boolean {
  if (!isRecord(value) || typeof value.title !== 'string') return false;
  if ('mapping' in value || 'chat_messages' in value || 'messages' in value || 'role' in value) return false;
  const header = typeof value.header === 'string' ? value.header : '';
  const products = Array.isArray(value.products) ? value.products.join(' ') : '';
  const blob = `${header} ${products}`.toLowerCase();
  const prompted = /^prompted\b/i.test(value.title);
  return prompted || blob.includes('gemini') || blob.includes('bard');
}

function geminiResponseFromDetails(details: unknown): string {
  if (!Array.isArray(details)) return '';
  const parts: string[] = [];
  for (const detail of details) {
    if (!isRecord(detail)) continue;
    const name = String(detail.name ?? detail.title ?? '').toLowerCase();
    if (!/response|answer|reply|gemini|bard|assistant|model/.test(name)) continue;
    const text = extractTextContent(detail.value ?? detail.text ?? detail.content);
    if (text) parts.push(text);
  }
  return parts.join('\n').trim();
}

function geminiActivityToConversation(value: Record<string, unknown>, index: number): NormalizedConversation | null {
  const rawTitle = typeof value.title === 'string' ? value.title.trim() : '';
  const userText = rawTitle.replace(/^prompted\s+/i, '').trim();
  const timestamp = toIsoTimestamp(value.time ?? value.timestamp);
  const messages: DraftMessage[] = [];
  if (userText) messages.push({ role: 'user', text: userText, timestamp });
  const response = geminiResponseFromDetails(value.details ?? value.subtitles);
  if (response) messages.push({ role: 'assistant', text: response, timestamp });
  return finalizeConversation({
    id: typeof value.titleUrl === 'string' ? value.titleUrl : undefined,
    title: userText || rawTitle,
    createdAt: timestamp,
    messages,
    sourceFormat: 'gemini',
    index,
  });
}

function tryGemini(value: unknown): NormalizedConversation[] | null {
  const list = Array.isArray(value) ? value : [value];
  if (!list.length || !list.every(isGeminiActivity)) return null;
  const conversations = list
    .map((item, index) => geminiActivityToConversation(item as Record<string, unknown>, index))
    .filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function isGrokConversation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (Array.isArray(value.conversation_items)) return true;
  if (Array.isArray(value.turns) && value.turns.some((turn) => isRecord(turn) && ('user' in turn) && ('assistant' in turn || 'grok' in turn || 'response' in turn))) {
    return true;
  }
  if (Array.isArray(value.messages) && value.messages.some((message) => {
    if (!isRecord(message)) return false;
    const role = String(message.role ?? message.sender ?? message.sender_type ?? '').toLowerCase();
    return role === 'grok';
  })) return true;
  return false;
}

function grokMessages(value: Record<string, unknown>): DraftMessage[] {
  if (Array.isArray(value.conversation_items)) {
    const drafts = value.conversation_items.map((item) => {
      if (!isRecord(item)) return null;
      const text = extractTextContent(item.message ?? item.text ?? item.content);
      return {
        role: normalizeRole(item.sender_type ?? item.sender ?? item.role),
        text,
        timestamp: toIsoTimestamp(item.created_at ?? item.create_time ?? item.timestamp),
      };
    });
    return keepMessages(drafts);
  }
  if (Array.isArray(value.turns)) {
    const messages: DraftMessage[] = [];
    for (const turn of value.turns) {
      if (!isRecord(turn)) continue;
      const timestamp = toIsoTimestamp(turn.timestamp ?? turn.created_at ?? turn.create_time);
      const userText = extractTextContent(turn.user);
      const assistantText = extractTextContent(turn.assistant ?? turn.grok ?? turn.response);
      if (userText) messages.push({ role: 'user', text: userText, timestamp });
      if (assistantText) messages.push({ role: 'assistant', text: assistantText, timestamp });
    }
    return messages;
  }
  if (Array.isArray(value.messages)) {
    return value.messages.map(readLooseMessage).filter((message): message is DraftMessage => message !== null);
  }
  return [];
}

function tryGrok(value: unknown, filename: string): NormalizedConversation[] | null {
  if (isRecord(value) && Array.isArray(value.grok_conversations)) {
    return tryGrok(value.grok_conversations, filename);
  }
  const list = Array.isArray(value) ? value : [value];
  const grokItems = list.filter(isGrokConversation);
  if (!grokItems.length || grokItems.length !== list.length) {
    if (/grok/i.test(filename)) {
      const generic = tryGeneric(value, filename);
      if (generic?.length) return generic.map((conversation) => ({ ...conversation, sourceFormat: 'grok' as const }));
    }
    return null;
  }
  const conversations = list.map((item, index) => {
    const record = item as Record<string, unknown>;
    return finalizeConversation({
      id: typeof record.conversation_id === 'string' ? record.conversation_id : typeof record.id === 'string' ? record.id : typeof record.conversationId === 'string' ? record.conversationId : undefined,
      title: typeof record.title === 'string' ? record.title : typeof record.name === 'string' ? record.name : undefined,
      createdAt: toIsoTimestamp(record.created_at ?? record.createdAt ?? record.createTime ?? record.create_time),
      messages: grokMessages(record),
      sourceFormat: 'grok',
      index,
    });
  }).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function conversationMessages(value: Record<string, unknown>): DraftMessage[] {
  const source = value.messages ?? value.items ?? value.chat;
  if (!Array.isArray(source)) return [];
  return source.map(readLooseMessage).filter((message): message is DraftMessage => message !== null);
}

function isGenericConversation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if ('mapping' in value || 'chat_messages' in value) return false;
  return conversationMessages(value).length > 0;
}

function genericConversation(value: Record<string, unknown>, index: number, filename: string): NormalizedConversation | null {
  return finalizeConversation({
    id: typeof value.id === 'string' ? value.id : typeof value.uuid === 'string' ? value.uuid : undefined,
    title: typeof value.title === 'string' ? value.title : typeof value.name === 'string' ? value.name : titleFromFilename(filename),
    createdAt: toIsoTimestamp(value.created_at ?? value.createdAt ?? value.create_time ?? value.timestamp),
    messages: conversationMessages(value),
    sourceFormat: 'generic-json',
    index,
  });
}

function tryGeneric(value: unknown, filename: string): NormalizedConversation[] | null {
  if (Array.isArray(value) && value.length > 0 && value.every(isLooseMessage)) {
    const conversation = finalizeConversation({
      title: titleFromFilename(filename),
      messages: value.map(readLooseMessage).filter((message): message is DraftMessage => message !== null),
      sourceFormat: 'generic-json',
      index: 0,
    });
    return conversation ? [conversation] : null;
  }
  if (isGenericConversation(value)) {
    const conversation = genericConversation(value as Record<string, unknown>, 0, filename);
    return conversation ? [conversation] : null;
  }
  if (Array.isArray(value) && value.length > 0 && value.every(isGenericConversation)) {
    const conversations = value
      .map((item, index) => genericConversation(item as Record<string, unknown>, index, filename))
      .filter((conversation): conversation is NormalizedConversation => conversation !== null);
    return conversations.length ? conversations : null;
  }
  if (isRecord(value) && isRecord(value.conversation)) {
    return tryGeneric(value.conversation, filename);
  }
  return null;
}

function parseJsonValue(value: unknown, filename: string): NormalizedConversation[] | null {
  return tryNormalized(value)
    ?? tryChatgpt(value)
    ?? tryClaude(value)
    ?? tryGemini(value)
    ?? tryGrok(value, filename)
    ?? tryGeneric(value, filename)
    ?? unwrapJson(value, filename);
}

function unwrapJson(value: unknown, filename: string): NormalizedConversation[] | null {
  if (!isRecord(value)) return null;
  for (const key of ENVELOPE_KEYS) {
    if (!(key in value)) continue;
    const inner = tryNormalized(value[key])
      ?? tryChatgpt(value[key])
      ?? tryClaude(value[key])
      ?? tryGemini(value[key])
      ?? tryGrok(value[key], filename)
      ?? tryGeneric(value[key], filename);
    if (inner?.length) {
      if (key === 'grok_conversations') {
        return inner.map((conversation) => ({ ...conversation, sourceFormat: 'grok' as const }));
      }
      return inner;
    }
  }
  return null;
}

function parseJsonlLines(text: string): unknown[] | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('//'));
  if (lines.length === 0) return null;
  const values: unknown[] = [];
  for (const line of lines) {
    if (!line.startsWith('{') && !line.startsWith('[')) return null;
    try {
      values.push(JSON.parse(line));
    } catch {
      return null;
    }
  }
  return values;
}

function tryJsonl(text: string, filename: string): NormalizedConversation[] | null {
  const values = parseJsonlLines(text);
  if (!values) return null;
  if (values.every(isLooseMessage)) {
    const groups = new Map<string, { title?: string; messages: DraftMessage[] }>();
    let grouped = false;
    values.forEach((value) => {
      const record = value as Record<string, unknown>;
      const id = record.conversation_id ?? record.conversationId ?? record.chat_id ?? record.thread_id;
      if (typeof id === 'string' && id) grouped = true;
      const key = typeof id === 'string' && id ? id : '__one__';
      const existing = groups.get(key) ?? { title: undefined, messages: [] };
      if (!existing.title && typeof record.title === 'string') existing.title = record.title;
      if (!existing.title && typeof record.conversation_title === 'string') existing.title = record.conversation_title;
      const message = readLooseMessage(record);
      if (message) existing.messages.push(message);
      groups.set(key, existing);
    });
    if (!grouped) {
      const only = groups.get('__one__');
      const conversation = finalizeConversation({
        title: only?.title || titleFromFilename(filename),
        messages: only?.messages ?? [],
        sourceFormat: 'jsonl',
        index: 0,
      });
      return conversation ? [conversation] : null;
    }
    const conversations = [...groups.entries()].map(([id, group], index) => finalizeConversation({
      id,
      title: group.title,
      messages: group.messages,
      sourceFormat: 'jsonl',
      index,
    })).filter((conversation): conversation is NormalizedConversation => conversation !== null);
    return conversations.length ? conversations : null;
  }

  const conversations: NormalizedConversation[] = [];
  for (const value of values) {
    const parsed = parseJsonValue(value, filename);
    if (parsed?.length) conversations.push(...parsed);
  }
  return conversations.length ? conversations : null;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') inQuotes = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (character !== '\r') {
      cell += character;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((columns) => columns.some((column) => column.trim() !== ''));
}

function headerIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) => candidates.includes(header));
}

function tryCsv(text: string, filename: string, strict: boolean): NormalizedConversation[] | null {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return strict ? null : null;
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, '_'));
  const roleIndex = headerIndex(headers, ROLE_HEADERS);
  const textIndex = headerIndex(headers, TEXT_HEADERS);
  if (roleIndex < 0 || textIndex < 0) {
    if (strict) {
      throw new ConversationParseError(unsupportedFormatMessage('this CSV needs a role column and a content column'));
    }
    return null;
  }
  const timeIndex = headerIndex(headers, TIME_HEADERS);
  const idIndex = headerIndex(headers, ID_HEADERS);
  const titleIndex = headerIndex(headers, TITLE_HEADERS);
  const groups = new Map<string, { title?: string; messages: DraftMessage[] }>();
  rows.slice(1).forEach((columns) => {
    const textValue = (columns[textIndex] || '').trim();
    if (!textValue) return;
    const id = idIndex >= 0 ? (columns[idIndex] || '').trim() : '';
    const key = id || '__one__';
    const group = groups.get(key) ?? { messages: [] };
    if (titleIndex >= 0 && !group.title) group.title = (columns[titleIndex] || '').trim() || undefined;
    group.messages.push({
      role: normalizeRole(columns[roleIndex] || ''),
      text: textValue,
      timestamp: timeIndex >= 0 ? toIsoTimestamp(columns[timeIndex]) : null,
    });
    groups.set(key, group);
  });
  const conversations = [...groups.entries()].map(([id, group], index) => finalizeConversation({
    id: id === '__one__' ? undefined : id,
    title: group.title || (id === '__one__' ? titleFromFilename(filename) : undefined),
    messages: group.messages,
    sourceFormat: 'csv',
    index,
  })).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function tryMarkdown(text: string, filename: string): NormalizedConversation[] | null {
  const lines = text.split(/\r?\n/);
  const roleHits = lines.filter((line) => ROLE_LINE.test(line.trim()) || ROLE_HEADING.test(line.trim())).length;
  if (roleHits === 0) return null;

  const sections: { title?: string; messages: DraftMessage[] }[] = [{ messages: [] }];
  let currentRole: DraftMessage['role'] | null = null;

  const pushSection = (title?: string) => {
    const current = sections[sections.length - 1];
    if (current.messages.length === 0 && !current.title) {
      current.title = title;
      return;
    }
    sections.push({ title, messages: [] });
    currentRole = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(?:---|\*\*\*|===)\s*$/.test(trimmed)) {
      pushSection();
      continue;
    }
    const headingRole = trimmed.match(ROLE_HEADING);
    if (headingRole) {
      currentRole = normalizeRole(headingRole[1]);
      sections[sections.length - 1].messages.push({ role: currentRole, text: '' });
      continue;
    }
    const roleLine = trimmed.match(ROLE_LINE);
    if (roleLine) {
      currentRole = normalizeRole(roleLine[1]);
      sections[sections.length - 1].messages.push({ role: currentRole, text: roleLine[2] || '' });
      continue;
    }
    const title = trimmed.match(/^#\s+(.+)$/);
    if (title && !ROLE_HEADING.test(trimmed)) {
      pushSection(title[1].trim());
      continue;
    }
    if (!trimmed || currentRole == null) continue;
    const messages = sections[sections.length - 1].messages;
    const last = messages[messages.length - 1];
    if (!last) continue;
    last.text = last.text ? `${last.text}\n${line.trimEnd()}` : line.trimEnd();
  }

  const conversations = sections.map((section, index) => finalizeConversation({
    title: section.title || titleFromFilename(filename),
    messages: section.messages,
    sourceFormat: 'markdown',
    index,
  })).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function stripHtml(html: string): string {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeHtml(text: string): boolean {
  const head = text.trim().slice(0, 800).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<div') || head.includes('<body') || head.includes('<p');
}

function tryGeminiHtml(html: string): NormalizedConversation[] | null {
  const lower = html.toLowerCase();
  if (!lower.includes('gemini') && !lower.includes('bard') && !/prompted\s/i.test(html)) return null;
  const cells = html.split(/<div[^>]*class="[^"]*content-cell[^"]*"[^>]*>/i).slice(1);
  const chunks = cells.length > 0 ? cells.map((cell) => cell.split(/<\/div>/i)[0]) : [html];
  const conversations = chunks.map((chunk, index) => {
    const text = stripHtml(chunk);
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    let timestamp: string | null = null;
    const content: string[] = [];
    let response: string | null = null;
    for (const line of lines) {
      const iso = toIsoTimestamp(line);
      if (iso && line.length < 80 && !/^prompted\b/i.test(line) && !/^(?:gemini|bard|assistant|response)\s*:/i.test(line)) {
        timestamp = iso;
        continue;
      }
      const responseMatch = line.match(/^(?:gemini|bard|assistant|response)\s*:\s*(.*)$/i);
      if (responseMatch) {
        response = responseMatch[1];
        continue;
      }
      if (response != null) {
        response = `${response}\n${line}`;
        continue;
      }
      content.push(line.replace(/^prompted\s+/i, ''));
    }
    const userText = content.join('\n').trim();
    const messages: DraftMessage[] = [];
    if (userText) messages.push({ role: 'user', text: userText, timestamp });
    if (response?.trim()) messages.push({ role: 'assistant', text: response.trim(), timestamp });
    return finalizeConversation({
      title: userText,
      createdAt: timestamp,
      messages,
      sourceFormat: 'gemini',
      index,
    });
  }).filter((conversation): conversation is NormalizedConversation => conversation !== null);
  return conversations.length ? conversations : null;
}

function geminiWarnings(conversations: NormalizedConversation[]): string[] {
  const gemini = conversations.filter((conversation) => conversation.sourceFormat === 'gemini');
  if (!gemini.length) return [];
  const hasAssistant = gemini.some((conversation) => conversation.messages.some((message) => message.role === 'assistant'));
  if (hasAssistant) return [];
  return ['Gemini My Activity exports usually include your prompts only, not the assistant replies. The analysis will use what you wrote.'];
}

export function parseConversationText(filename: string, text: string): ParseResult {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) throw new ConversationParseError(unsupportedFormatMessage('the file is empty'));
  const extension = extensionOf(filename);

  if (looksLikeHtml(cleaned)) {
    const gemini = tryGeminiHtml(cleaned);
    if (gemini?.length) return resultFrom(gemini, geminiWarnings(gemini));
    const stripped = stripHtml(cleaned);
    const transcript = tryMarkdown(stripped, filename);
    if (transcript?.length) return resultFrom(transcript);
  }

  let jsonParsed = false;
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const value = JSON.parse(cleaned) as unknown;
      jsonParsed = true;
      const conversations = parseJsonValue(value, filename);
      if (conversations?.length) return resultFrom(conversations, geminiWarnings(conversations));
    } catch {
      jsonParsed = false;
    }
  }

  if (extension === '.jsonl' || extension === '.ndjson' || !jsonParsed) {
    const jsonl = tryJsonl(cleaned, filename);
    if (jsonl?.length) return resultFrom(jsonl, geminiWarnings(jsonl));
  }

  if (extension === '.csv') {
    const csv = tryCsv(cleaned, filename, true);
    if (csv?.length) return resultFrom(csv);
  } else {
    const csv = tryCsv(cleaned, filename, false);
    if (csv?.length && headerLooksDelimited(cleaned)) return resultFrom(csv);
  }

  const transcript = tryMarkdown(cleaned, filename);
  if (transcript?.length) return resultFrom(transcript);

  if (jsonParsed) {
    throw new ConversationParseError(unsupportedFormatMessage('this JSON does not look like a conversation export'));
  }
  throw new ConversationParseError(unsupportedFormatMessage());
}

function headerLooksDelimited(text: string): boolean {
  const first = text.split(/\r?\n/, 1)[0] || '';
  return first.includes(',') && ROLE_HEADERS.some((header) => first.toLowerCase().includes(header))
    && TEXT_HEADERS.some((header) => first.toLowerCase().includes(header));
}

function shouldSkipZipEntry(name: string): boolean {
  const base = name.split(/[/\\]/).pop() || name;
  if (!base || base === '.DS_Store' || base.startsWith('._') || name.includes('__MACOSX')) return true;
  return SKIP_EXTENSIONS.has(extensionOf(base));
}

async function parseZip(data: Uint8Array, depth: number): Promise<ParseResult> {
  let entries;
  try {
    entries = await unzipArchive(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'the ZIP could not be opened';
    throw new ConversationParseError(unsupportedFormatMessage(detail));
  }
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new ConversationParseError(unsupportedFormatMessage(`the ZIP has more than ${MAX_ZIP_ENTRIES} files`));
  }
  const conversations: NormalizedConversation[] = [];
  const warnings: string[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const entry of entries) {
    if (shouldSkipZipEntry(entry.name)) continue;
    total += entry.data.byteLength;
    if (entry.data.byteLength > MAX_ENTRY_BYTES || total > MAX_TOTAL_UNCOMPRESSED) {
      throw new ConversationParseError(unsupportedFormatMessage('the ZIP uncompressed contents are too large'));
    }
    try {
      const parsed = await parseConversationExport(entry.name, entry.data, depth + 1);
      conversations.push(...parsed.conversations);
      warnings.push(...parsed.warnings);
    } catch {
      skipped.push(entry.name.split(/[/\\]/).pop() || entry.name);
    }
  }
  if (!conversations.length) {
    const detail = skipped.length
      ? `nothing inside the ZIP matched a supported export (${skipped.slice(0, 5).join(', ')})`
      : 'the ZIP did not contain any readable conversation files';
    throw new ConversationParseError(unsupportedFormatMessage(detail));
  }
  const formatsFound = uniqueFormats(conversations);
  return {
    conversations,
    format: formatsFound.length === 1 ? formatsFound[0] : 'mixed',
    formatsFound,
    warnings,
  };
}

export async function parseConversationExport(
  filename: string,
  data: Uint8Array | string,
  depth = 0,
): Promise<ParseResult> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const extension = extensionOf(filename);
  if (depth > 2) throw new ConversationParseError(unsupportedFormatMessage('the archive is nested too deeply'));
  if (extension === '.zip' || isZipBytes(bytes)) return parseZip(bytes, depth);
  const text = typeof data === 'string' ? data : new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return parseConversationText(filename, text);
}

export const ACCEPTED_UPLOAD_EXTENSIONS = ['.json', '.jsonl', '.ndjson', '.zip', '.md', '.markdown', '.txt', '.csv', '.html', '.htm'];
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function validateUploadFile(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File size must be less than 100MB.';
  const extension = extensionOf(file.name);
  if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension)) {
    return `Unsupported file type "${extension || 'unknown'}". Upload a .json, .jsonl, .zip, .md, .txt, .csv, or Gemini .html export.`;
  }
  return null;
}

const FORMAT_LABELS: Record<ParseResult['format'], string> = {
  normalized: 'a saved conversation export',
  chatgpt: 'a ChatGPT export',
  claude: 'a Claude export',
  gemini: 'a Gemini export',
  grok: 'a Grok export',
  'generic-json': 'a JSON conversation export',
  jsonl: 'a JSONL conversation export',
  markdown: 'a text transcript',
  csv: 'a CSV export',
  mixed: 'a mixed conversation export',
};

export function describeDetectedFormat(format: ParseResult['format']): string {
  return FORMAT_LABELS[format] || 'a conversation export';
}

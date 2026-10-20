import JSZip from 'jszip';

export interface ParsedConversation {
  id?: string;
  title?: string;
  create_time?: number;
  mapping?: Record<string, unknown>;
}

const MAX_BYTES = 200 * 1024 * 1024;

export async function readExportFile(file: File): Promise<unknown> {
  if (file.size > MAX_BYTES) {
    throw new Error('File must be under 200MB. Upload conversations.json on its own if the zip is huge.');
  }

  const name = file.name.toLowerCase();
  const isZip = name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
  if (isZip) {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      throw new Error('That zip could not be opened. Export your data again and upload the new file.');
    }
    const jsonFiles = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'));
    const preferred = jsonFiles.find((entry) => /(^|\/)conversations\.json$/i.test(entry.name)) || jsonFiles[0];
    if (!preferred) {
      throw new Error('No JSON file inside that zip. ChatGPT exports include conversations.json.');
    }
    return parseJson(await preferred.async('string'), preferred.name);
  }

  if (!name.endsWith('.json')) {
    throw new Error('Upload a .json chat export, or the .zip you downloaded from ChatGPT.');
  }

  let text = '';
  try {
    text = await file.text();
  } catch {
    throw new Error('The file could not be read.');
  }
  return parseJson(text, file.name);
}

export function conversationsFromExport(parsed: unknown): ParsedConversation[] {
  const rawList = extractConversationArray(parsed);
  const conversations: ParsedConversation[] = [];
  const failures: string[] = [];

  rawList.forEach((raw, index) => {
    try {
      conversations.push(normalizeConversation(raw, index));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Unknown conversation');
    }
  });

  if (conversations.length === 0) {
    throw new Error(failures[0] || 'No conversations found in that export.');
  }

  return conversations;
}

function parseJson(text: string, filename: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${filename} is not valid JSON.`);
  }
}

function extractConversationArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That file is not a conversation export.');
  }

  const record = parsed as Record<string, unknown>;
  for (const key of ['conversations', 'chats', 'items', 'data', 'history']) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) return value;
  }

  const arrays = Object.values(record).filter((value) => Array.isArray(value) && value.length > 0) as unknown[][];
  if (arrays.length === 0) {
    throw new Error('No conversations found. Use a ChatGPT conversations.json or a Grok chat history export.');
  }
  arrays.sort((a, b) => b.length - a.length);
  return arrays[0];
}

function normalizeConversation(raw: unknown, index: number): ParsedConversation {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Conversation ${index + 1} could not be read.`);
  }
  const record = raw as Record<string, any>;
  const title = stringValue(record.title || record.name || record.conversation_title) || `Conversation ${index + 1}`;
  const create_time = toUnixSeconds(record.create_time ?? record.created_at ?? record.timestamp ?? record.createTime);

  if (record.mapping && typeof record.mapping === 'object' && !Array.isArray(record.mapping)) {
    return { id: stringValue(record.id), title, create_time, mapping: record.mapping };
  }

  const messages = record.messages || record.chat_messages || (Array.isArray(record.conversation) ? record.conversation : null);
  if (Array.isArray(messages) && messages.length > 0) {
    return {
      id: stringValue(record.id) || `conv-${index}`,
      title,
      create_time,
      mapping: messagesToMapping(messages, index, create_time),
    };
  }

  const text = stringValue(record.content || record.text || record.message);
  if (text) {
    const id = stringValue(record.id) || `conv-${index}`;
    return {
      id,
      title,
      create_time,
      mapping: {
        [id]: messageNode('user', text, create_time),
      },
    };
  }

  throw new Error(`“${title}” is not a ChatGPT or message-list conversation.`);
}

function messagesToMapping(messages: any[], index: number, createTime?: number) {
  const mapping: Record<string, unknown> = {};
  messages.forEach((message, messageIndex) => {
    if (!message || typeof message !== 'object') return;
    const id = stringValue(message.id) || `m-${index}-${messageIndex}`;
    const role = normalizeRole(message.author?.role || message.role || message.sender);
    const text = messageText(message);
    if (!text) return;
    mapping[id] = messageNode(role, text, toUnixSeconds(message.create_time ?? message.timestamp) ?? createTime);
  });
  if (Object.keys(mapping).length === 0) {
    throw new Error('A conversation had no readable messages.');
  }
  return mapping;
}

function messageNode(role: string, text: string, createTime?: number) {
  return {
    message: {
      author: { role },
      content: { parts: [text] },
      create_time: createTime,
    },
  };
}

function normalizeRole(role: unknown): string {
  const value = String(role || 'user').toLowerCase();
  if (['assistant', 'ai', 'bot', 'model', 'grok', 'chatgpt'].includes(value)) return 'assistant';
  if (value === 'system') return 'system';
  return 'user';
}

function messageText(message: Record<string, any>): string {
  if (typeof message.content === 'string') return message.content;
  if (typeof message.text === 'string') return message.text;
  if (typeof message.message === 'string') return message.message;
  if (Array.isArray(message.content?.parts)) {
    return message.content.parts.filter((part: unknown) => typeof part === 'string').join('\n');
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function toUnixSeconds(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && value.trim() !== '') return toUnixSeconds(asNumber);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return undefined;
}

import type { ParseResult } from '../conversationParser/types';

export const ARCHIVE_BUCKET = 'upload-archive';
export const ARCHIVE_MAX_BYTES = 200 * 1024 * 1024;
export const ARCHIVE_CHUNK_BYTES = 6 * 1024 * 1024;
/** 30 stored copies per network (and per account) per hour. Enough to retry a real export, not enough for a dump script. */
export const ARCHIVE_RATE_LIMIT = 30;
export const ARCHIVE_RATE_WINDOW_MS = 60 * 60 * 1000;

/** How long until the oldest upload in the window ages out. At least one minute, so the message is never "0 minutes". */
export function uploadRateLimitMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  if (minutes < 60) {
    return `Too many uploads from this network. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  const hours = Math.max(1, Math.ceil(minutes / 60));
  return `Too many uploads from this network. Try again in about ${hours} hour${hours === 1 ? '' : 's'}.`;
}

export const DETECTED_FORMATS = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Grok',
  'JSON',
  'JSONL',
  'Markdown',
  'CSV',
  'HTML',
  'mixed',
  'unreadable',
] as const;

export type DetectedFormat = (typeof DETECTED_FORMATS)[number];

const EXTENSIONS: Record<string, string[]> = {
  '.json': ['application/json', 'text/json', 'text/plain', 'application/octet-stream', ''],
  '.jsonl': ['application/json', 'application/x-ndjson', 'application/jsonl', 'text/plain', 'application/octet-stream', ''],
  '.ndjson': ['application/json', 'application/x-ndjson', 'application/jsonl', 'text/plain', 'application/octet-stream', ''],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', ''],
  '.md': ['text/markdown', 'text/plain', 'application/octet-stream', ''],
  '.markdown': ['text/markdown', 'text/plain', 'application/octet-stream', ''],
  '.txt': ['text/plain', 'application/octet-stream', ''],
  '.csv': ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream', ''],
  '.html': ['text/html', 'application/octet-stream', ''],
  '.htm': ['text/html', 'application/octet-stream', ''],
};

const CANONICAL_TYPE: Record<string, string> = {
  '.json': 'application/json',
  '.jsonl': 'application/x-ndjson',
  '.ndjson': 'application/x-ndjson',
  '.zip': 'application/zip',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.htm': 'text/html',
};

export const FORBIDDEN_ARCHIVE_FIELDS = [
  'apikey',
  'api_key',
  'authorization',
  'secret',
  'providerkey',
  'provider_key',
  'modeloutput',
  'model_output',
  'messages',
  'casefile',
  'case_file',
];

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}

export function sanitizeFilename(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? 'export').replace(/\0/g, '');
  const cleaned = base.replace(/[^\w.\- ()]+/g, '_').replace(/^\.+/, '').slice(0, 180);
  return cleaned || 'export';
}

export function canonicalContentType(filename: string, contentType: string): string | null {
  const extension = extensionOf(filename);
  const allowed = EXTENSIONS[extension];
  if (!allowed) return null;
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (!allowed.includes(normalized)) return null;
  return CANONICAL_TYPE[extension] ?? null;
}

export function validateArchiveStart(input: { filename: string; size: number; contentType: string }): string | null {
  if (!input.filename.trim()) return 'The file needs a name.';
  if (!Number.isFinite(input.size) || !Number.isInteger(input.size)) return 'The file size is not valid.';
  if (input.size <= 0) return 'That file is empty.';
  if (input.size > ARCHIVE_MAX_BYTES) return 'File size must be less than 200MB.';
  if (!canonicalContentType(input.filename, input.contentType)) {
    return 'That file type cannot be stored. Upload a JSON, JSONL, ZIP, Markdown, text, CSV, or HTML export.';
  }
  return null;
}

export function expectedChunkLength(offset: number, size: number): number | null {
  if (!Number.isInteger(offset) || offset < 0 || offset > size) return null;
  const remaining = size - offset;
  if (remaining <= 0) return null;
  return Math.min(ARCHIVE_CHUNK_BYTES, remaining);
}

export function validateDetectedFormat(value: unknown): value is DetectedFormat {
  return typeof value === 'string' && (DETECTED_FORMATS as readonly string[]).includes(value);
}

export function validateConversationCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000;
}

export function archiveFormatLabel(format: ParseResult['format'] | 'unreadable'): DetectedFormat {
  switch (format) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    case 'grok': return 'Grok';
    case 'generic-json':
    case 'normalized':
      return 'JSON';
    case 'jsonl': return 'JSONL';
    case 'markdown': return 'Markdown';
    case 'csv': return 'CSV';
    case 'mixed': return 'mixed';
    default: return 'unreadable';
  }
}

export function forbiddenField(keys: Iterable<string>): string | null {
  for (const key of keys) {
    if (FORBIDDEN_ARCHIVE_FIELDS.includes(key.toLowerCase())) {
      return 'The archive accepts only the export file. Provider keys and model output are not stored.';
    }
  }
  return null;
}

export function rateLimitAllows(countInWindow: number, limit = ARCHIVE_RATE_LIMIT): boolean {
  return countInWindow < limit;
}

export function isSampleRead(search: string): boolean {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('sample') === '1';
}

export function resumableEndpoint(supabaseUrl: string): string {
  const url = new URL(supabaseUrl);
  if (url.hostname.endsWith('.supabase.co')) {
    const ref = url.hostname.slice(0, -'.supabase.co'.length);
    return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${url.origin}/storage/v1/upload/resumable`;
}

export function clientAddress(headers: Headers): string {
  const cloudflare = headers.get('cf-connecting-ip')?.trim();
  if (cloudflare) return cloudflare;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return 'unknown';
}

import { ARCHIVE_CHUNK_BYTES, archiveFormatLabel } from './policy';
import type { ParseResult } from '../conversationParser/types';

export class ArchiveUploadError extends Error {
  constructor(message = 'The copy could not be stored, so the analysis did not run.') {
    super(message);
    this.name = 'ArchiveUploadError';
  }
}

export interface ArchiveMetadata {
  detectedFormat: ReturnType<typeof archiveFormatLabel>;
  conversationCount: number;
}

interface ArchiveClientOptions {
  filename: string;
  bytes: Uint8Array;
  contentType: string;
  metadata: Promise<ArchiveMetadata>;
  supabaseUrl: string;
  anonKey: string;
  accessToken: string | null;
  fetchImpl?: typeof fetch;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === 'string' && body.error.length > 0 && body.error.length < 240) return body.error;
  } catch {
    // The status is enough.
  }
  return 'The copy could not be stored, so the analysis did not run.';
}

export async function archiveExportFile(options: ArchiveClientOptions): Promise<{ id: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const call = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await fetchImpl(input, init);
    } catch {
      throw new ArchiveUploadError();
    }
  };
  const endpoint = new URL('/functions/v1/archive-upload', options.supabaseUrl);
  const headers = {
    authorization: `Bearer ${options.accessToken ?? options.anonKey}`,
    apikey: options.anonKey,
  };
  const started = await call(endpoint, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'start',
      filename: options.filename,
      size: options.bytes.byteLength,
      contentType: options.contentType,
    }),
  });
  if (!started.ok) throw new ArchiveUploadError(await readError(started));
  const startBody = await started.json() as { token?: unknown };
  if (typeof startBody.token !== 'string') throw new ArchiveUploadError();

  let token = startBody.token;
  for (let offset = 0; offset < options.bytes.byteLength; offset += ARCHIVE_CHUNK_BYTES) {
    const chunk = options.bytes.subarray(offset, offset + ARCHIVE_CHUNK_BYTES);
    const form = new FormData();
    form.set('token', token);
    form.set('offset', String(offset));
    form.set('chunk', new Blob([chunk]));
    const uploaded = await call(endpoint, { method: 'POST', headers, body: form });
    if (!uploaded.ok) throw new ArchiveUploadError(await readError(uploaded));
    const chunkBody = await uploaded.json() as { token?: unknown };
    if (typeof chunkBody.token !== 'string') throw new ArchiveUploadError();
    token = chunkBody.token;
  }

  const metadata = await options.metadata.catch(() => ({
    detectedFormat: 'unreadable' as const,
    conversationCount: 0,
  }));
  const finished = await call(endpoint, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'finish',
      token,
      detectedFormat: metadata.detectedFormat,
      conversationCount: metadata.conversationCount,
    }),
  });
  if (!finished.ok) throw new ArchiveUploadError(await readError(finished));
  const done = await finished.json() as { id?: unknown };
  if (typeof done.id !== 'string') throw new ArchiveUploadError();
  return { id: done.id };
}

export function metadataFromParse(parsed: ParseResult): ArchiveMetadata {
  return {
    detectedFormat: archiveFormatLabel(parsed.format),
    conversationCount: parsed.conversations.length,
  };
}

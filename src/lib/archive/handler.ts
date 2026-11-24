import {
  ARCHIVE_BUCKET,
  ARCHIVE_CHUNK_BYTES,
  ARCHIVE_RATE_LIMIT,
  ARCHIVE_RATE_WINDOW_MS,
  uploadRateLimitMessage,
  canonicalContentType,
  clientAddress,
  expectedChunkLength,
  forbiddenField,
  resumableEndpoint,
  sanitizeFilename,
  validateArchiveStart,
  validateConversationCount,
  validateDetectedFormat,
} from './policy';
import { reserveRateSlotWithWait } from '../server/rateLimit';
import { bytesToHex, emptySha256State, sha256Digest, sha256Update } from './sha256';
import { openSession, sealSession, subjectHash, type ArchiveSession } from './token';

export interface ArchiveDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function failure(message: string, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

async function userIdFromRequest(request: Request, deps: ArchiveDeps, fetchImpl: typeof fetch): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const jwt = header.replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt === deps.anonKey) return null;
  const response = await fetchImpl(new URL('/auth/v1/user', deps.supabaseUrl), {
    headers: { authorization: `Bearer ${jwt}`, apikey: deps.anonKey },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  const id = body && typeof body === 'object' && 'id' in body ? (body as { id?: unknown }).id : null;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function tusMetadata(path: string, contentType: string): string {
  const encode = (value: string) => btoa(value);
  return [
    `bucketName ${encode(ARCHIVE_BUCKET)}`,
    `objectName ${encode(path)}`,
    `contentType ${encode(contentType)}`,
    `cacheControl ${encode('0')}`,
  ].join(',');
}

async function readJson(request: Request): Promise<{ value: Record<string, unknown> } | { error: Response }> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > 64 * 1024) return { error: failure('That request is too large.', 413) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: failure('The upload request could not be read.', 400) };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: failure('The upload request could not be read.', 400) };
  }
  const record = body as Record<string, unknown>;
  const blocked = forbiddenField(Object.keys(record));
  if (blocked) return { error: failure(blocked, 400) };
  return { value: record };
}

export async function handleArchiveUpload(request: Request, deps: ArchiveDeps): Promise<Response> {
  if (!deps.supabaseUrl || !deps.serviceRoleKey || !deps.anonKey) {
    return failure('Archive storage is not configured.', 503);
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? Date.now();
  const admin = { supabaseUrl: deps.supabaseUrl, serviceRoleKey: deps.serviceRoleKey, fetchImpl };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return failure('Method not allowed.', 405);

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) return handleChunk(request, deps, fetchImpl, now);

  const parsed = await readJson(request);
  if ('error' in parsed) return parsed.error;
  const action = parsed.value.action;
  if (action === 'start') return handleStart(request, parsed.value, deps, admin, fetchImpl, now);
  if (action === 'finish') return handleFinish(parsed.value, admin, now);
  return failure('Unknown archive action.', 400);
}

async function handleStart(
  request: Request,
  body: Record<string, unknown>,
  deps: ArchiveDeps,
  admin: Required<Pick<ArchiveDeps, 'supabaseUrl' | 'serviceRoleKey' | 'fetchImpl'>>,
  fetchImpl: typeof fetch,
  now: number,
): Promise<Response> {
  const filename = typeof body.filename === 'string' ? body.filename : '';
  const size = typeof body.size === 'number' ? body.size : Number.NaN;
  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  const invalid = validateArchiveStart({ filename, size, contentType });
  if (invalid) return failure(invalid, invalid.includes('200MB') ? 413 : 415);
  const storedType = canonicalContentType(filename, contentType);
  if (!storedType) return failure('That file type cannot be stored.', 415);

  const userId = await userIdFromRequest(request, deps, fetchImpl);
  const subjects = [await subjectHash('ip', clientAddress(request.headers), deps.serviceRoleKey)];
  if (userId) subjects.push(await subjectHash('user', userId, deps.serviceRoleKey));
  const decision = await reserveRateSlotWithWait({
    ...admin,
    subjects,
    now,
    limit: ARCHIVE_RATE_LIMIT,
    windowMs: ARCHIVE_RATE_WINDOW_MS,
  });
  if (!decision.allowed) {
    const retryAfterMs = decision.retryAfterMs;
    return failure(uploadRateLimitMessage(retryAfterMs), 429, {
      'retry-after': String(Math.ceil(retryAfterMs / 1000)),
    });
  }

  const path = `archive/${crypto.randomUUID()}`;
  const created = await fetchImpl(resumableEndpoint(deps.supabaseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${deps.serviceRoleKey}`,
      apikey: deps.serviceRoleKey,
      'tus-resumable': '1.0.0',
      'upload-length': String(size),
      'upload-metadata': tusMetadata(path, storedType),
      'x-upsert': 'false',
    },
  });
  if (!created.ok) return failure('The copy could not be stored, so the analysis did not run.', 502);
  const locationHeader = created.headers.get('location');
  if (!locationHeader) return failure('The copy could not be stored, so the analysis did not run.', 502);
  const location = new URL(locationHeader, resumableEndpoint(deps.supabaseUrl)).toString();
  const session: ArchiveSession = {
    path,
    filename: sanitizeFilename(filename),
    size,
    contentType: storedType,
    userId,
    exp: now + 2 * 60 * 60 * 1000,
    offset: 0,
    hash: emptySha256State(),
    location,
  };
  return json({ token: await sealSession(session, deps.serviceRoleKey) });
}

async function handleChunk(
  request: Request,
  deps: ArchiveDeps,
  fetchImpl: typeof fetch,
  now: number,
): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > ARCHIVE_CHUNK_BYTES + 1024 * 1024) return failure('That chunk is too large.', 413);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure('The upload chunk could not be read.', 400);
  }
  const blocked = forbiddenField(form.keys());
  if (blocked) return failure(blocked, 400);
  const token = form.get('token');
  const offset = Number(form.get('offset'));
  const chunk = form.get('chunk');
  if (typeof token !== 'string' || !Number.isInteger(offset) || !(chunk instanceof Blob)) {
    return failure('The upload chunk could not be read.', 400);
  }
  if (chunk.size > ARCHIVE_CHUNK_BYTES) return failure('That chunk is too large.', 413);
  const session = await openSession(token, deps.serviceRoleKey, now);
  if (!session) return failure('The upload session expired. Choose the file again.', 400);
  const expected = expectedChunkLength(session.offset, session.size);
  if (expected === null || offset !== session.offset || chunk.size !== expected) {
    return failure('The upload chunk did not line up. Choose the file again.', 409);
  }
  const bytes = new Uint8Array(await chunk.arrayBuffer());
  const patched = await fetchImpl(session.location, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${deps.serviceRoleKey}`,
      apikey: deps.serviceRoleKey,
      'tus-resumable': '1.0.0',
      'upload-offset': String(session.offset),
      'content-type': 'application/offset+octet-stream',
    },
    body: bytes,
  });
  if (!patched.ok) return failure('The copy could not be stored, so the analysis did not run.', 502);
  const received = Number(patched.headers.get('upload-offset'));
  const nextOffset = session.offset + bytes.length;
  if (received !== nextOffset) return failure('The copy could not be stored, so the analysis did not run.', 502);
  const next: ArchiveSession = {
    ...session,
    offset: nextOffset,
    hash: sha256Update(session.hash, bytes),
    exp: now + 2 * 60 * 60 * 1000,
  };
  return json({ token: await sealSession(next, deps.serviceRoleKey), offset: nextOffset });
}

async function handleFinish(
  body: Record<string, unknown>,
  admin: Required<Pick<ArchiveDeps, 'supabaseUrl' | 'serviceRoleKey' | 'fetchImpl'>>,
  now: number,
): Promise<Response> {
  if (typeof body.token !== 'string') return failure('The upload session expired. Choose the file again.', 400);
  if (!validateDetectedFormat(body.detectedFormat) || !validateConversationCount(body.conversationCount)) {
    return failure('The export description could not be stored.', 400);
  }
  const session = await openSession(body.token, admin.serviceRoleKey, now);
  if (!session) return failure('The upload session expired. Choose the file again.', 400);
  if (session.offset !== session.size) return failure('The copy is incomplete, so the analysis did not run.', 409);
  const sha256 = bytesToHex(sha256Digest(session.hash));
  const response = await admin.fetchImpl(new URL('/rest/v1/upload_archive', admin.supabaseUrl), {
    method: 'POST',
    headers: {
      apikey: admin.serviceRoleKey,
      authorization: `Bearer ${admin.serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: session.userId,
      storage_path: session.path,
      original_filename: session.filename,
      size_bytes: session.size,
      sha256,
      detected_format: body.detectedFormat,
      conversation_count: body.conversationCount,
    }),
  });
  if (!response.ok) return failure('The copy could not be stored, so the analysis did not run.', 502);
  const rows: unknown = await response.json();
  const id = Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' ? (rows[0] as { id?: unknown }).id : null;
  if (typeof id !== 'string') return failure('The copy could not be stored, so the analysis did not run.', 502);
  return json({ id });
}

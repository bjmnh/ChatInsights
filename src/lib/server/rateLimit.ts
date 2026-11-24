export async function countRecent(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl: typeof fetch;
  subject: string;
  sinceIso: string;
}): Promise<{ count: number; oldestAtMs: number | null }> {
  const url = new URL('/rest/v1/upload_rate_events', options.supabaseUrl);
  url.searchParams.set('select', 'created_at');
  url.searchParams.set('subject', `eq.${options.subject}`);
  url.searchParams.set('created_at', `gte.${options.sinceIso}`);
  url.searchParams.set('order', 'created_at.asc');
  url.searchParams.set('limit', '1');
  const response = await options.fetchImpl(url, {
    headers: {
      apikey: options.serviceRoleKey,
      authorization: `Bearer ${options.serviceRoleKey}`,
      prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error('rate lookup failed');
  const count = Number((response.headers.get('content-range') ?? '').split('/').pop());
  if (!Number.isFinite(count)) throw new Error('rate lookup failed');
  const rows = await response.json().catch(() => []) as { created_at?: string }[];
  const oldest = rows[0]?.created_at ? Date.parse(rows[0].created_at) : null;
  return { count, oldestAtMs: oldest != null && Number.isFinite(oldest) ? oldest : null };
}

export async function reserveRateSlot(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl: typeof fetch;
  subjects: string[];
  now: number;
  limit: number;
  windowMs: number;
}): Promise<boolean> {
  const decision = await reserveRateSlotWithWait(options);
  return decision.allowed;
}

export async function reserveRateSlotWithWait(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl: typeof fetch;
  subjects: string[];
  now: number;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const since = new Date(options.now - options.windowMs).toISOString();
  for (const subject of options.subjects) {
    const recent = await countRecent({ ...options, subject, sinceIso: since });
    if (recent.count >= options.limit) {
      const retryAfterMs = recent.oldestAtMs == null
        ? options.windowMs
        : Math.max(60_000, recent.oldestAtMs + options.windowMs - options.now);
      return { allowed: false, retryAfterMs };
    }
  }
  for (const subject of options.subjects) {
    const response = await options.fetchImpl(new URL('/rest/v1/upload_rate_events', options.supabaseUrl), {
      method: 'POST',
      headers: {
        apikey: options.serviceRoleKey,
        authorization: `Bearer ${options.serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ subject }),
    });
    if (!response.ok) throw new Error('rate write failed');
  }
  return { allowed: true, retryAfterMs: 0 };
}

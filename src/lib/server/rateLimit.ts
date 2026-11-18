export async function countRecent(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl: typeof fetch;
  subject: string;
  sinceIso: string;
}): Promise<number> {
  const url = new URL('/rest/v1/upload_rate_events', options.supabaseUrl);
  url.searchParams.set('select', 'id');
  url.searchParams.set('subject', `eq.${options.subject}`);
  url.searchParams.set('created_at', `gte.${options.sinceIso}`);
  const response = await options.fetchImpl(url, {
    headers: {
      apikey: options.serviceRoleKey,
      authorization: `Bearer ${options.serviceRoleKey}`,
      prefer: 'count=exact',
      range: '0-0',
    },
  });
  if (!response.ok) throw new Error('rate lookup failed');
  const count = Number((response.headers.get('content-range') ?? '').split('/').pop());
  if (!Number.isFinite(count)) throw new Error('rate lookup failed');
  return count;
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
  const since = new Date(options.now - options.windowMs).toISOString();
  for (const subject of options.subjects) {
    const count = await countRecent({ ...options, subject, sinceIso: since });
    if (count >= options.limit) return false;
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
  return true;
}

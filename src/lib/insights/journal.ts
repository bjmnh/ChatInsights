export interface JournalEntry {
  key: string;
  date: string | null;
  title: string;
  body: string;
  earlier: string | null;
  quote: string | null;
  ev: string[];
  kind: 'decision' | 'reversal' | 'contradiction';
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asEv(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function asReversed(value: unknown): { v: string; date: string | null; ev: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') return { v: value.trim(), date: null, ev: [] };
  if (typeof value !== 'object') return null;
  const row = value as { v?: unknown; text?: unknown; date?: unknown; ev?: unknown };
  const text = asText(row.v) || asText(row.text);
  if (!text) return null;
  return { v: text, date: asText(row.date) || null, ev: asEv(row.ev) };
}

function asCited(value: unknown): { v: string; quote: string | null; ev: string[]; first: string | null; last: string | null } {
  if (typeof value === 'string') return { v: value.trim(), quote: null, ev: [], first: null, last: null };
  if (!value || typeof value !== 'object') return { v: '', quote: null, ev: [], first: null, last: null };
  const row = value as { v?: unknown; text?: unknown; quote?: unknown; ev?: unknown; first?: unknown; last?: unknown };
  return {
    v: asText(row.v) || asText(row.text),
    quote: asText(row.quote) || null,
    ev: asEv(row.ev),
    first: asText(row.first) || null,
    last: asText(row.last) || null,
  };
}

/** Decisions, reversals, and contradictions in date order, with the chats that support them. Older saves may omit fields. */
export function journalEntries(file: { decisions?: unknown; contradictions?: unknown } | null | undefined): JournalEntry[] {
  const rows: JournalEntry[] = [];
  for (const raw of asList(file?.decisions)) {
    if (typeof raw === 'string') {
      if (!raw.trim()) continue;
      rows.push({ key: `d:${raw}`, date: null, title: raw.trim(), body: raw.trim(), earlier: null, quote: null, ev: [], kind: 'decision' });
      continue;
    }
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { question?: unknown; v?: unknown; text?: unknown; quote?: unknown; ev?: unknown; first?: unknown; last?: unknown; reversed?: unknown };
    const body = asText(item.v) || asText(item.text);
    const title = asText(item.question) || body;
    if (!title && !body) continue;
    const reversed = asReversed(item.reversed);
    const ev = [...new Set([...asEv(item.ev), ...(reversed?.ev ?? [])])];
    rows.push({
      key: `d:${title}:${body}`,
      date: asText(item.last) || asText(item.first) || reversed?.date || null,
      title: title || body,
      body: body || title,
      earlier: reversed?.v ?? null,
      quote: asText(item.quote) || null,
      ev,
      kind: reversed ? 'reversal' : 'decision',
    });
  }
  for (const raw of asList(file?.contradictions)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { field?: unknown; earlier?: unknown; later?: unknown };
    const earlier = asCited(item.earlier);
    const later = asCited(item.later);
    if (!earlier.v && !later.v) continue;
    rows.push({
      key: `c:${asText(item.field)}:${earlier.v}:${later.v}`,
      date: later.last || later.first || earlier.last || earlier.first,
      title: asText(item.field) || 'Contradiction',
      body: later.v || earlier.v,
      earlier: earlier.v || null,
      quote: later.quote || earlier.quote,
      ev: [...new Set([...earlier.ev, ...later.ev])],
      kind: 'contradiction',
    });
  }
  return rows.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title));
}

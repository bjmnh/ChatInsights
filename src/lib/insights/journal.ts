import type { CaseFile } from './merge.ts';

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

/** Decisions, reversals, and contradictions in date order, with the chats that support them. */
export function journalEntries(file: Pick<CaseFile, 'decisions' | 'contradictions'>): JournalEntry[] {
  const rows: JournalEntry[] = [];
  for (const item of file.decisions) {
    const ev = item.reversed ? [...new Set([...item.ev, ...item.reversed.ev])] : item.ev;
    rows.push({
      key: `d:${item.question}:${item.v}`,
      date: item.last ?? item.first ?? item.reversed?.date ?? null,
      title: item.question || item.v,
      body: item.v,
      earlier: item.reversed?.v ?? null,
      quote: item.quote,
      ev,
      kind: item.reversed ? 'reversal' : 'decision',
    });
  }
  for (const item of file.contradictions) {
    rows.push({
      key: `c:${item.field}:${item.earlier.v}:${item.later.v}`,
      date: item.later.last ?? item.later.first ?? item.earlier.last ?? item.earlier.first,
      title: item.field,
      body: item.later.v,
      earlier: item.earlier.v,
      quote: item.later.quote ?? item.earlier.quote,
      ev: [...new Set([...item.earlier.ev, ...item.later.ev])],
      kind: 'contradiction',
    });
  }
  return rows.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title));
}

import { formatFiledDate, publicSubjectName } from './hydratePremium.ts';
import type { CaseFile } from './merge.ts';

export interface ShareCard {
  codename: string;
  depth: string;
  conversations: number;
  read: number;
  wordsPerMessage: number;
  questionShare: number;
  months: number;
  providers: number;
}

const DEPTHS: Record<string, string> = {
  quick: 'Quick scan',
  standard: 'Standard read',
  deep: 'Deep read',
  forensic: 'Forensic read',
};

/** Codename and counts only. Names, quotes, and identifiers are not copied onto the card. */
export function shareCard(file: CaseFile): ShareCard {
  return {
    codename: publicSubjectName(file),
    depth: DEPTHS[file.model.depth] ?? file.model.depth,
    conversations: file.coverage.conversations,
    read: file.coverage.read,
    wordsPerMessage: file.style?.wordsPerMessage ?? 0,
    questionShare: file.style?.questionShare ?? 0,
    months: file.usage?.byMonth?.length ?? 0,
    providers: file.usage?.providers?.length ?? 0,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

export function shareCardHtml(file: CaseFile): string {
  const card = shareCard(file);
  const question = `${Math.round(card.questionShare * 100)}%`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(card.codename)}</title></head>
<body style="font-family: Georgia, serif; background:#14110d; color:#f6e7c1; margin:0; padding:48px;">
  <article style="max-width:520px; margin:0 auto; border:1px solid #8a6a32; padding:32px;">
    <p style="letter-spacing:.18em; text-transform:uppercase; font-size:12px;">Chat Insights</p>
    <h1 style="font-weight:normal; font-size:40px;">Subject: ${escapeHtml(card.codename)}</h1>
    <p>${escapeHtml(card.depth)} · ${card.read} of ${card.conversations} conversations</p>
    <p>About ${card.wordsPerMessage} words per message. Question share ${question}.</p>
    <p>${card.months} active month${card.months === 1 ? '' : 's'} · ${card.providers} source${card.providers === 1 ? '' : 's'}</p>
    <p style="font-size:13px;">This card uses the codename and counts only. It has no names, quotes, or identifiers.</p>
  </article>
</body>
</html>`;
}

export interface FootnoteSource {
  title: string;
  date: string | null;
}

function footnote(id: string, sources: Map<string, FootnoteSource>, used: Map<string, number>): number | null {
  if (!id || !sources.has(id)) return null;
  const existing = used.get(id);
  if (existing) return existing;
  const next = used.size + 1;
  used.set(id, next);
  return next;
}

function line(text: string, ev: string[] | undefined, sources: Map<string, FootnoteSource>, used: Map<string, number>): string {
  const marks = (ev ?? []).map((id) => footnote(id, sources, used)).filter((mark): mark is number => mark != null);
  const unique = [...new Set(marks)];
  return unique.length ? `${text} ${unique.map((mark) => `[^${mark}]`).join(' ')}` : text;
}

/** The report as Markdown. Footnotes name the conversation title and date, not the quote. */
export function caseMarkdown(file: CaseFile, sources: Map<string, FootnoteSource>): string {
  const used = new Map<string, number>();
  const sections: string[] = [`# ${publicSubjectName(file)}`, '', file.narrative.cover, ''];
  const blocks: Array<[string, Array<{ v: string; ev?: string[] }>]> = [
    ['People', file.people.map((person) => ({ v: person.relationship ? `${person.name} (${person.relationship})` : person.name, ev: person.ev }))],
    ['Decisions', file.decisions.map((item) => ({ v: item.reversed ? `${item.question}: ${item.v} (earlier: ${item.reversed.v})` : `${item.question}: ${item.v}`, ev: item.ev }))],
    ['Projects', file.projects],
    ['Open loops', file.open_loops],
    ['Worries', file.worries],
  ];
  for (const [title, rows] of blocks) {
    const filled = rows.filter((row) => row.v?.trim());
    if (!filled.length) continue;
    sections.push(`## ${title}`, '');
    for (const row of filled) sections.push(`- ${line(row.v.trim(), row.ev, sources, used)}`);
    sections.push('');
  }
  if (used.size) {
    sections.push('## Sources', '');
    const ordered = [...used.entries()].sort((a, b) => a[1] - b[1]);
    for (const [id, mark] of ordered) {
      const source = sources.get(id);
      const date = formatFiledDate(source?.date);
      sections.push(`[^${mark}]: ${source?.title || 'Source chat'}${date ? ` · ${date}` : ''}`);
    }
    sections.push('');
  }
  return sections.join('\n');
}

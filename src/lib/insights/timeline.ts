import type { CaseFile, Cited } from './merge.ts';

export type SpineKind = 'person' | 'project' | 'worry';

export interface SpineChoice {
  kind: SpineKind;
  label: string;
}

export interface SpineDot {
  month: string;
  label: string;
  quote: string | null;
  ev: string[];
}

export interface LoopNode {
  id: string;
  label: string;
  kind: 'loop' | 'worry' | 'project';
  month: string;
  status: 'open' | 'recurring' | 'resolved';
  ev: string[];
  quote: string | null;
}

export function monthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{2}/);
  return match ? match[0] : null;
}

export function spineChoices(file: CaseFile): SpineChoice[] {
  return [
    ...file.people.map((person) => ({ kind: 'person' as const, label: person.name })),
    ...file.projects.map((item) => ({ kind: 'project' as const, label: item.v })),
    ...file.worries.map((item) => ({ kind: 'worry' as const, label: item.v })),
  ].filter((choice) => choice.label.trim());
}

function monthsOf(first: string | null, last: string | null, extra?: string | null): string[] {
  return [...new Set([monthKey(first), monthKey(last), monthKey(extra)].filter((month): month is string => Boolean(month)))];
}

function dot(month: string, label: string, quote: string | null, ev: string[]): SpineDot {
  return { month, label, quote, ev: ev.filter(Boolean) };
}

export function monthSpine(file: CaseFile, kind: SpineKind, label: string): SpineDot[] {
  const needle = label.trim().toLowerCase();
  const dots: SpineDot[] = [];
  const share = (item: Cited) => item.ev.some((id) => dots.some((entry) => entry.ev.includes(id))) || item.v.toLowerCase().includes(needle) || needle.includes(item.v.toLowerCase());
  if (kind === 'person') {
    const person = file.people.find((item) => item.name.trim().toLowerCase() === needle);
    if (person) {
      for (const month of monthsOf(person.first, person.last)) dots.push(dot(month, person.name, person.quote, person.ev));
    }
  }
  if (kind === 'project') {
    const project = file.projects.find((item) => item.v.trim().toLowerCase() === needle);
    if (project) {
      for (const month of monthsOf(project.first, project.last)) dots.push(dot(month, project.v, project.quote, project.ev));
    }
  }
  if (kind === 'worry') {
    const worry = file.worries.find((item) => item.v.trim().toLowerCase() === needle);
    if (worry) {
      for (const month of monthsOf(worry.first, worry.last)) dots.push(dot(month, worry.v, worry.quote, worry.ev));
    }
  }
  const related = [...file.decisions, ...file.worries, ...file.projects, ...file.open_loops];
  for (const item of related) {
    const text = 'question' in item ? `${item.question} ${item.v}` : item.v;
    if (!share(item) && !text.toLowerCase().includes(needle)) continue;
    const reversed = 'reversed' in item ? item.reversed : null;
    const extra = reversed && typeof reversed === 'object' && 'date' in reversed && typeof reversed.date === 'string' ? reversed.date : null;
    for (const month of monthsOf(item.first, item.last, extra)) {
      if (dots.some((entry) => entry.month === month && entry.label === text)) continue;
      dots.push(dot(month, text, item.quote, item.ev));
    }
  }
  return dots.sort((a, b) => a.month.localeCompare(b.month) || a.label.localeCompare(b.label));
}

function decided(file: CaseFile, label: string): boolean {
  const needle = label.trim().toLowerCase();
  return file.decisions.some((item) => `${item.question} ${item.v}`.toLowerCase().includes(needle));
}

export function loopGraph(file: CaseFile): { months: string[]; nodes: LoopNode[] } {
  const nodes: LoopNode[] = [];
  const push = (kind: LoopNode['kind'], label: string, first: string | null, last: string | null, ev: string[], quote: string | null) => {
    const months = monthsOf(first, last);
    const month = months[0] ?? 'undated';
    const recurring = months.length > 1;
    const resolved = decided(file, label);
    nodes.push({
      id: `${kind}:${label}:${month}`,
      label,
      kind,
      month,
      status: resolved ? 'resolved' : recurring ? 'recurring' : 'open',
      ev,
      quote,
    });
  };
  for (const item of file.open_loops) push('loop', item.v, item.first, item.last, item.ev, item.quote);
  for (const item of file.worries) push('worry', item.v, item.first, item.last, item.ev, item.quote);
  for (const item of file.projects) push('project', item.v, item.first, item.last, item.ev, item.quote);
  const months = [...new Set(nodes.map((node) => node.month))].sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return a.localeCompare(b);
  });
  return { months, nodes };
}

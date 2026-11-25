import type { LocalReport } from './localPass.ts';

const REASON_LABELS: Record<string, string> = {
  identifier: 'Identifiers',
  health: 'Health',
  money: 'Money',
  person: 'A person',
  long: 'Long chats',
  intense: 'Intense language',
  self: 'About you',
};

export interface LocalReportView {
  people: { name: string; count: number }[];
  reasons: { id: string; label: string; count: number }[];
  hours: number[];
  weekdays: number[];
  peakHours: number[];
  exposure: {
    emails: number;
    phones: number;
    cardLike: number;
    urls: number;
    keyLike: number;
    chats: number;
  };
  providers: { name: string; count: number }[];
  byMonth: { month: string; count: number }[];
  conversations: number;
  flagged: number;
}

/** The free report. Counts only; raw addresses and numbers stay off this view. */
export function localReportView(report: LocalReport): LocalReportView {
  const people = new Map<string, number>();
  const reasons = new Map<string, number>();
  for (const item of report.conversations) {
    for (const person of item.people) {
      const name = person.trim();
      if (!name) continue;
      people.set(name, (people.get(name) ?? 0) + 1);
    }
    for (const reason of item.reasons) {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }
  return {
    people: [...people.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 12),
    reasons: [...reasons.entries()]
      .map(([id, count]) => ({ id, label: REASON_LABELS[id] ?? id, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    hours: report.routines.hours,
    weekdays: report.routines.weekdays,
    peakHours: report.routines.peakHours,
    exposure: {
      emails: report.exposure.emails.length,
      phones: report.exposure.phones.length,
      cardLike: report.exposure.cardLike,
      urls: report.exposure.urls,
      keyLike: report.exposure.keyLike,
      chats: report.exposure.ev.length,
    },
    providers: report.usage.providers,
    byMonth: report.usage.byMonth,
    conversations: report.totals.conversations,
    flagged: report.totals.flagged,
  };
}

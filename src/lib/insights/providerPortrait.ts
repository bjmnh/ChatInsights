import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { LocalReport } from './localPass.ts';

export interface ProviderPortrait {
  provider: string;
  conversations: number;
  messages: number;
  wordsPerMessage: number;
  questionShare: number;
  topics: { topic: string; ev: string[] }[];
}

const LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  normalized: 'Sample',
  'generic-json': 'Other JSON',
  jsonl: 'JSONL',
  markdown: 'Markdown',
  csv: 'CSV',
};

export function providerLabel(source: string): string {
  return LABELS[source] ?? source;
}

export const COMBINABLE_PROVIDERS = ['ChatGPT', 'Claude', 'Gemini', 'Grok'] as const;

export function combineExports(batches: NormalizedConversation[][]): NormalizedConversation[] {
  const byId = new Map<string, NormalizedConversation>();
  for (const batch of batches) {
    for (const conversation of batch) {
      const current = byId.get(conversation.id);
      if (!current || conversation.messages.length > current.messages.length) byId.set(conversation.id, conversation);
    }
  }
  return [...byId.values()];
}

export function providerPortraits(
  report: LocalReport,
  topics: { c: string; topic: string }[] = [],
): ProviderPortrait[] {
  const groups = new Map<string, LocalReport['conversations']>();
  for (const conversation of report.conversations) {
    const list = groups.get(conversation.sourceFormat) ?? [];
    list.push(conversation);
    groups.set(conversation.sourceFormat, list);
  }
  const topicById = new Map<string, string[]>();
  for (const topic of topics) {
    if (!topic.topic.trim()) continue;
    const list = topicById.get(topic.c) ?? [];
    list.push(topic.topic.trim());
    topicById.set(topic.c, list);
  }
  return [...groups.entries()].map(([provider, rows]) => {
    const messages = rows.reduce((sum, row) => sum + row.userMessages, 0);
    const words = rows.reduce((sum, row) => sum + row.userWords, 0);
    const questions = rows.reduce((sum, row) => sum + row.questionMessages, 0);
    const topicCounts = new Map<string, string[]>();
    for (const row of rows) {
      for (const topic of topicById.get(row.id) ?? []) {
        const ev = topicCounts.get(topic) ?? [];
        ev.push(row.id);
        topicCounts.set(topic, ev);
      }
    }
    return {
      provider,
      conversations: rows.length,
      messages,
      wordsPerMessage: messages ? Math.round(words / messages) : 0,
      questionShare: messages ? Math.round((questions / messages) * 1000) / 1000 : 0,
      topics: [...topicCounts.entries()]
        .map(([topic, ev]) => ({ topic, ev }))
        .sort((a, b) => b.ev.length - a.ev.length || a.topic.localeCompare(b.topic))
        .slice(0, 4),
    };
  }).sort((a, b) => b.conversations - a.conversations || a.provider.localeCompare(b.provider));
}

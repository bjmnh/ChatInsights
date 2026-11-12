import type { LocalReport } from './localPass.ts';

export type DepthId = 'quick' | 'standard' | 'deep' | 'forensic';

export const DEPTHS: { id: DepthId; title: string; summary: string }[] = [
  {
    id: 'quick',
    title: 'Quick scan',
    summary: 'Local scores every chat. The model sees about the top 10% — user turns, short summary only.',
  },
  {
    id: 'standard',
    title: 'Standard',
    summary: 'The default. Every chat the local pass flagged, user turns, full extract, then a short write-up if the budget allows.',
  },
  {
    id: 'deep',
    title: 'Deep',
    summary: 'Every conversation’s user turns. Assistant replies are shortened to a line. Full extract and a write-up.',
  },
  {
    id: 'forensic',
    title: 'Forensic',
    summary: 'Full threads, including assistant turns, then a check pass over the quotes. The most expensive option.',
  },
];

export const CARD_IDS = [
  'file',
  'people',
  'places',
  'timeline',
  'interests',
  'decisions',
  'loops',
  'mind',
  'sensitive',
  'style',
  'usage',
  'notable',
  'stranger',
] as const;

export type CardId = (typeof CARD_IDS)[number];
export type CardState = 'ready' | 'partial' | 'local' | 'not-searched';

const LOCAL_READY: Record<CardId, CardState> = {
  file: 'ready',
  people: 'ready',
  places: 'ready',
  timeline: 'ready',
  interests: 'ready',
  decisions: 'ready',
  loops: 'ready',
  mind: 'ready',
  sensitive: 'ready',
  style: 'local',
  usage: 'local',
  notable: 'ready',
  stranger: 'ready',
};

export function cardStates(depth: DepthId): Record<CardId, CardState> {
  if (depth === 'quick') {
    return {
      file: 'partial',
      people: 'partial',
      places: 'partial',
      timeline: 'not-searched',
      interests: 'partial',
      decisions: 'not-searched',
      loops: 'not-searched',
      mind: 'partial',
      sensitive: 'partial',
      style: 'local',
      usage: 'local',
      notable: 'partial',
      stranger: 'not-searched',
    };
  }
  if (depth === 'standard') {
    return { ...LOCAL_READY, stranger: 'partial' };
  }
  return { ...LOCAL_READY };
}

export function cardStateLabel(state: CardState, depth: DepthId): string | null {
  if (state === 'not-searched') return 'Not searched at this depth.';
  if (state === 'local') return 'From the local pass. No model call.';
  if (state === 'partial' && depth === 'quick') return 'Partial. Quick scan only sent a sample of your chats.';
  if (state === 'partial' && depth === 'standard') return 'Cautious. Standard only sent chats the local pass flagged.';
  if (state === 'partial') return 'Partial.';
  return null;
}

export interface Selection {
  chosenIds: string[];
  skippedIds: string[];
}

export function selectConversations(local: LocalReport, depth: DepthId, quickFraction = 0.1): Selection {
  const ranked = [...local.conversations].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  if (!ranked.length) return { chosenIds: [], skippedIds: [] };
  if (depth === 'quick') {
    const fraction = Math.min(1, Math.max(0.01, quickFraction));
    const count = Math.max(1, Math.ceil(ranked.length * fraction));
    return {
      chosenIds: ranked.slice(0, count).map((item) => item.id),
      skippedIds: ranked.slice(count).map((item) => item.id),
    };
  }
  if (depth === 'standard') {
    const chosen = ranked.filter((item) => item.flagged);
    const skipped = ranked.filter((item) => !item.flagged);
    return {
      chosenIds: chosen.map((item) => item.id),
      skippedIds: skipped.map((item) => item.id),
    };
  }
  return { chosenIds: ranked.map((item) => item.id), skippedIds: [] };
}

export function defaultBatchCap(depth: DepthId): number {
  if (depth === 'quick') return 50;
  if (depth === 'forensic') return 8;
  return 30;
}

/** Shrink the batch when the context window cannot hold the default cap. */
export function batchSizeFor(depth: DepthId, contextWindow: number, averageTokens: number): number {
  const cap = defaultBatchCap(depth);
  if (!contextWindow || contextWindow < 1) return cap;
  const average = Math.max(1, averageTokens);
  const room = Math.floor((contextWindow * 0.6 - 3000) / average);
  return Math.max(1, Math.min(cap, room));
}

export const QUICK_KINDS = new Set([
  'person',
  'place',
  'org',
  'interest',
  'health',
  'money',
  'work',
  'self',
  'pii',
  'emotion',
  'worry',
  'relationship',
  'substance',
]);

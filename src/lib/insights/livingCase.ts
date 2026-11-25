import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { CaseFile } from './merge.ts';

export interface ConversationStamp {
  id: string;
  messages: number;
  updatedAt: string | null;
  sourceFormat: string;
}

export interface ConversationDelta {
  added: string[];
  changed: string[];
  unchanged: string[];
  dropped: string[];
}

export interface ChangeItem {
  label: string;
  detail: string;
  ev: string[];
  quote: string | null;
}

export interface CaseChanges {
  added: number;
  changed: number;
  dropped: number;
  peopleAdded: ChangeItem[];
  peopleDropped: ChangeItem[];
  projectsAdded: ChangeItem[];
  loopsAdded: ChangeItem[];
  reversals: ChangeItem[];
  worriesShifted: ChangeItem[];
}

function lastStamp(conversation: NormalizedConversation): string | null {
  let latest = conversation.createdAt;
  for (const message of conversation.messages) {
    if (message.timestamp && (!latest || message.timestamp > latest)) latest = message.timestamp;
  }
  return latest;
}

export function stampsFrom(conversations: NormalizedConversation[]): ConversationStamp[] {
  return conversations.map((conversation) => ({
    id: conversation.id,
    messages: conversation.messages.length,
    updatedAt: lastStamp(conversation),
    sourceFormat: conversation.sourceFormat,
  }));
}

/** Ids a saved file can be recognized by when it was stored before stamps existed. */
export function stampsFromCase(file: CaseFile): ConversationStamp[] {
  if (file.lineage?.stamps?.length) return file.lineage.stamps;
  const ids = new Set<string>();
  for (const id of file.coverage.selectedIds ?? []) ids.add(id);
  for (const topic of file.coverage.topics) ids.add(topic.c);
  for (const item of file.notable) ids.add(item.id);
  const cited = [
    ...file.people, ...file.projects, ...file.open_loops, ...file.worries, ...file.decisions,
  ];
  for (const item of cited) {
    for (const id of item.ev ?? []) ids.add(id);
  }
  return [...ids].filter(Boolean).map((id) => ({ id, messages: 0, updatedAt: null, sourceFormat: 'unknown' }));
}

export function conversationDelta(previous: ConversationStamp[], next: NormalizedConversation[]): ConversationDelta {
  const prior = new Map(previous.map((stamp) => [stamp.id, stamp]));
  const seen = new Set<string>();
  const added: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];
  for (const conversation of next) {
    seen.add(conversation.id);
    const stamp = prior.get(conversation.id);
    if (!stamp) {
      added.push(conversation.id);
      continue;
    }
    if (stamp.messages === 0) {
      unchanged.push(conversation.id);
      continue;
    }
    const updatedAt = lastStamp(conversation);
    const countChanged = stamp.messages !== conversation.messages.length;
    const timeChanged = Boolean(stamp.updatedAt && updatedAt && updatedAt > stamp.updatedAt);
    if (countChanged || timeChanged) changed.push(conversation.id);
    else unchanged.push(conversation.id);
  }
  const dropped = previous.map((stamp) => stamp.id).filter((id) => !seen.has(id));
  return { added, changed, unchanged, dropped };
}

export function matchSavedCase(
  incoming: ConversationStamp[],
  fingerprint: string,
  candidate: { fingerprint?: string | null; file: CaseFile },
): 'fingerprint' | 'ids' | null {
  const origin = candidate.file.lineage?.originFingerprint;
  const latest = candidate.file.lineage?.fingerprint;
  if (fingerprint && (fingerprint === candidate.fingerprint || fingerprint === origin || fingerprint === latest)) return 'fingerprint';
  const prev = new Set(stampsFromCase(candidate.file).map((stamp) => stamp.id));
  const shared = incoming.filter((stamp) => prev.has(stamp.id)).length;
  if (shared >= 2) return 'ids';
  if (shared >= 1 && Math.min(incoming.length, prev.size) <= 3) return 'ids';
  return null;
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function item(label: string, detail: string, ev: string[] = [], quote: string | null = null): ChangeItem {
  return { label, detail, ev, quote };
}

export function caseDiff(before: CaseFile, after: CaseFile, counts: Pick<ConversationDelta, 'added' | 'changed' | 'dropped'>): CaseChanges {
  const beforePeople = new Set(before.people.map((person) => norm(person.name)));
  const afterPeople = new Set(after.people.map((person) => norm(person.name)));
  const beforeProjects = new Set(before.projects.map((row) => norm(row.v)));
  const beforeLoops = new Set(before.open_loops.map((row) => norm(row.v)));
  const beforeWorries = new Set(before.worries.map((row) => norm(row.v)));
  const beforeReversed = new Map(before.decisions.filter((row) => row.reversed).map((row) => [norm(row.question || row.v), norm(row.reversed?.v ?? '')]));
  return {
    added: counts.added.length,
    changed: counts.changed.length,
    dropped: counts.dropped.length,
    peopleAdded: after.people.filter((person) => !beforePeople.has(norm(person.name))).map((person) => item(person.name, person.relationship ?? '', person.ev, person.quote)),
    peopleDropped: before.people.filter((person) => !afterPeople.has(norm(person.name))).map((person) => item(person.name, person.relationship ?? '', person.ev, person.quote)),
    projectsAdded: after.projects.filter((row) => !beforeProjects.has(norm(row.v))).map((row) => item(row.v, '', row.ev, row.quote)),
    loopsAdded: after.open_loops.filter((row) => !beforeLoops.has(norm(row.v))).map((row) => item(row.v, '', row.ev, row.quote)),
    reversals: after.decisions.filter((row) => row.reversed && beforeReversed.get(norm(row.question || row.v)) !== norm(row.reversed?.v ?? '')).map((row) => item(row.question || row.v, row.v, [...new Set([...row.ev, ...(row.reversed?.ev ?? [])])], row.quote)),
    worriesShifted: after.worries.filter((row) => !beforeWorries.has(norm(row.v))).map((row) => item(row.v, '', row.ev, row.quote)),
  };
}

function keepCited<T extends { ev?: string[] }>(items: T[], changed: Set<string>): T[] {
  return items.filter((item) => {
    const ev = item.ev ?? [];
    if (!ev.length) return true;
    return ev.some((id) => !changed.has(id));
  });
}

/** Drop findings that came only from chats that are about to be re-read. */
export function stripChangedFacts(file: CaseFile, changedIds: string[]): CaseFile {
  const changed = new Set(changedIds);
  if (!changed.size) return file;
  return {
    ...file,
    people: keepCited(file.people, changed),
    places: keepCited(file.places, changed),
    orgs: keepCited(file.orgs, changed),
    timeline: keepCited(file.timeline, changed),
    projects: keepCited(file.projects, changed),
    interests: keepCited(file.interests, changed),
    beliefs: keepCited(file.beliefs, changed),
    worries: keepCited(file.worries, changed),
    health: keepCited(file.health, changed),
    money: keepCited(file.money, changed),
    decisions: keepCited(file.decisions, changed),
    open_loops: keepCited(file.open_loops, changed),
  };
}

import type { NormalizedConversation } from '../conversationParser/types.ts';
import { quoteAppears, SUPPORT_NOTE, toneOk } from './checks.ts';
import { cardStates, QUICK_KINDS, type CardId, type CardState, type DepthId } from './depth.ts';
import type { LocalReport } from './localPass.ts';
import type { Fact, NarrativeDraft } from './schema.ts';

export type NarrativeStatus = 'written' | 'templated' | 'not-in-depth' | 'skipped-budget' | 'failed';

export interface Cited {
  v: string;
  conf: number;
  ev: string[];
  src: 'ai' | 'local' | 'ai+local';
  first: string | null;
  last: string | null;
  quote: string | null;
}

export interface PersonRecord extends Cited {
  id: string;
  name: string;
  relationship: string | null;
  mentions: number;
}

export interface Coverage {
  conversations: number;
  planned: number;
  read: number;
  skipped: number;
  batches: number;
  failed: number;
  depth: DepthId;
  partial: boolean;
  partialReason?: string;
  narrative: NarrativeStatus;
  viaProxy: boolean;
  dateRange: { first: string | null; last: string | null };
  topics: { c: string; topic: string }[];
}

export interface CaseFile {
  schema_version: '1.0';
  model: { provider: string; id: string; depth: DepthId };
  coverage: Coverage;
  subject: {
    nameGuess?: Cited;
    location?: Cited;
    occupation?: Cited;
    languages?: Cited;
  };
  people: PersonRecord[];
  places: Cited[];
  orgs: Cited[];
  timeline: Cited[];
  projects: Cited[];
  routines: LocalReport['routines'];
  interests: Cited[];
  beliefs: Cited[];
  worries: Cited[];
  health: Cited[];
  money: Cited[];
  decisions: Array<Cited & { question: string; reversed: { v: string; date: string | null; ev: string[] } | null }>;
  open_loops: Cited[];
  contradictions: Array<{ field: string; earlier: Cited; later: Cited }>;
  exposure: LocalReport['exposure'];
  style: LocalReport['style'];
  usage: LocalReport['usage'];
  notable: Array<LocalReport['notable'][number] & { modelRead: boolean }>;
  narrative: { cover: string; blurbs: Record<string, string>; ev: string[] };
  supportNote?: string;
  cardStatus: Record<CardId, CardState>;
}

export function computeConfidence(input: {
  support: number;
  corroborated: boolean;
  recent: boolean;
  hasQuote: boolean;
}): number {
  let score = 0.42 + Math.min(Math.max(input.support, 1), 5) * 0.08;
  if (input.corroborated) score += 0.14;
  if (input.recent) score += 0.08;
  if (input.hasQuote) score += 0.08;
  return Math.round(Math.min(0.97, Math.max(0.2, score)) * 100) / 100;
}

export function isComplete(caseFile: CaseFile): boolean {
  const coverage = caseFile.coverage;
  if (coverage.partial || coverage.failed > 0) return false;
  if (coverage.read !== coverage.planned) return false;
  if (coverage.read + coverage.skipped !== coverage.conversations) return false;
  if (coverage.narrative === 'skipped-budget' || coverage.narrative === 'failed') return false;
  return coverage.narrative === 'written' || coverage.narrative === 'templated' || coverage.narrative === 'not-in-depth';
}

export function reportLabel(caseFile: CaseFile): 'Partial' | 'Complete' {
  return isComplete(caseFile) ? 'Complete' : 'Partial';
}

export function finalizeCoverage(coverage: Omit<Coverage, 'partial'> & { partial?: boolean; partialReason?: string }): Coverage {
  const forced =
    Boolean(coverage.partial) ||
    coverage.failed > 0 ||
    coverage.read !== coverage.planned ||
    coverage.read + coverage.skipped !== coverage.conversations ||
    coverage.narrative === 'skipped-budget' ||
    coverage.narrative === 'failed';
  return { ...coverage, partial: forced };
}

function depthLabel(depth: DepthId): string {
  if (depth === 'quick') return 'Quick scan';
  if (depth === 'standard') return 'Standard';
  if (depth === 'deep') return 'Deep';
  return 'Forensic';
}

export function templateCover(input: {
  depth: DepthId;
  provider: string;
  model: string;
  read: number;
  conversations: number;
  skipped: number;
}): string {
  const scope =
    input.depth === 'forensic'
      ? 'full threads'
      : input.depth === 'quick'
        ? 'a sample of user turns'
        : 'user turns';
  const skipped =
    input.skipped > 0 ? ` ${input.skipped} conversations were not sent at this depth.` : '';
  return `This ${depthLabel(input.depth)} read used your ${input.provider} key and ${input.model}. It looked at ${scope} in ${input.read} of ${input.conversations} conversations.${skipped}`;
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function recentEnough(date: string | null, newest: string | null): boolean {
  if (!date || !newest) return false;
  const fact = Date.parse(date.length === 7 ? `${date}-01` : date);
  const end = Date.parse(newest);
  if (Number.isNaN(fact) || Number.isNaN(end)) return false;
  return end - fact < 1000 * 60 * 60 * 24 * 540;
}

function citeGroup(facts: Fact[], newest: string | null, corroborated: boolean): Cited {
  const ev = [...new Set(facts.map((fact) => fact.c))];
  const dates = facts.map((fact) => fact.t).filter((date): date is string => Boolean(date)).sort();
  const quote = facts.find((fact) => fact.q)?.q ?? null;
  return {
    v: facts[0].v,
    conf: computeConfidence({
      support: ev.length,
      corroborated,
      recent: dates.some((date) => recentEnough(date, newest)) || recentEnough(facts[0].t, newest),
      hasQuote: Boolean(quote),
    }),
    ev,
    src: corroborated ? 'ai+local' : 'ai',
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
    quote,
  };
}

function groupByValue(facts: Fact[]): Fact[][] {
  const map = new Map<string, Fact[]>();
  for (const fact of facts) {
    const key = norm(fact.v);
    const list = map.get(key) ?? [];
    list.push(fact);
    map.set(key, list);
  }
  return [...map.values()];
}

function localCited(value: string, ev: string[], newest: string | null): Cited {
  return {
    v: value,
    conf: computeConfidence({ support: Math.max(1, ev.length), corroborated: true, recent: recentEnough(newest, newest), hasQuote: false }),
    ev,
    src: 'local',
    first: null,
    last: null,
    quote: null,
  };
}

export function buildCaseFile(input: {
  conversations: NormalizedConversation[];
  local: LocalReport;
  depth: DepthId;
  provider: string;
  model: string;
  facts: Fact[];
  topics: { c: string; topic: string }[];
  plannedIds: string[];
  skippedIds: string[];
  failedIds: string[];
  batches: number;
  narrative: NarrativeDraft | null;
  narrativeStatus: NarrativeStatus;
  viaProxy: boolean;
  partialReason?: string;
}): CaseFile {
  const byId = new Map(input.conversations.map((conversation) => [conversation.id, conversation]));
  const known = new Set(byId.keys());
  const readIds = new Set<string>();
  const kept: Fact[] = [];
  for (const fact of input.facts) {
    if (!known.has(fact.c)) continue;
    if (input.depth === 'quick' && !QUICK_KINDS.has(fact.k)) continue;
    const conversation = byId.get(fact.c);
    if (!conversation) continue;
    const userText = conversation.messages.filter((message) => message.role === 'user').map((message) => message.text).join('\n');
    const assistantText = conversation.messages.filter((message) => message.role === 'assistant').map((message) => message.text).join('\n');
    const sources = input.depth === 'forensic' ? [userText, assistantText] : [userText];
    if (!quoteAppears(fact.q, sources)) continue;
    if (fact.q && /\b(hopeless|suicid|self[- ]harm|kill myself)\b/i.test(fact.q)) continue;
    kept.push(fact);
    readIds.add(fact.c);
  }
  for (const topic of input.topics) {
    if (known.has(topic.c) && input.plannedIds.includes(topic.c) && !input.failedIds.includes(topic.c)) readIds.add(topic.c);
  }
  const planned = new Set(input.plannedIds);
  const read = [...readIds].filter((id) => planned.has(id) && !input.failedIds.includes(id));
  const localPeople = new Map<string, string[]>();
  const localPlaces = new Map<string, string[]>();
  for (const item of input.local.conversations) {
    for (const person of item.people) {
      const list = localPeople.get(norm(person)) ?? [];
      list.push(item.id);
      localPeople.set(norm(person), list);
    }
    for (const place of item.places) {
      const list = localPlaces.get(norm(place)) ?? [];
      list.push(item.id);
      localPlaces.set(norm(place), list);
    }
  }

  const peopleFacts = kept.filter((fact) => fact.k === 'person' || fact.k === 'relationship');
  const peopleFromAi = groupByValue(peopleFacts).map((group, index) => {
    const cited = citeGroup(group, input.local.lastAt, localPeople.has(norm(group[0].v)));
    const relationship = group.find((fact) => fact.k === 'relationship' || /sister|brother|mother|father|partner|friend|spouse|wife|husband|kid|son|daughter/i.test(fact.d ?? ''))?.d ?? null;
    const localEv = localPeople.get(norm(group[0].v)) ?? [];
    return {
      ...cited,
      ev: [...new Set([...cited.ev, ...localEv])],
      src: localEv.length ? 'ai+local' as const : cited.src,
      id: `p${index + 1}`,
      name: group[0].v,
      relationship,
      mentions: cited.ev.length + localEv.length,
    };
  });
  const aiNames = new Set(peopleFromAi.map((person) => norm(person.name)));
  const peopleLocalOnly: PersonRecord[] = [];
  let localIndex = peopleFromAi.length;
  for (const [name, ev] of localPeople) {
    if (aiNames.has(name)) continue;
    localIndex += 1;
    const display = input.local.conversations.flatMap((item) => item.people).find((person) => norm(person) === name) ?? name;
    peopleLocalOnly.push({
      ...localCited(display, [...new Set(ev)], input.local.lastAt),
      id: `p${localIndex}`,
      name: display,
      relationship: null,
      mentions: ev.length,
    });
  }

  const ofKind = (kind: Fact['k'], corroborate?: (value: string) => boolean) =>
    groupByValue(kept.filter((fact) => fact.k === kind)).map((group) =>
      citeGroup(group, input.local.lastAt, corroborate ? corroborate(group[0].v) : false),
    );

  const selfFacts = kept.filter((fact) => fact.k === 'self');
  const subjectField = (field: string): Cited | undefined => {
    const matching = selfFacts.filter((fact) => (fact.d ?? '').toLowerCase().includes(field));
    if (!matching.length) return undefined;
    return citeGroup(matching, input.local.lastAt, false);
  };

  const decisionGroups = new Map<string, Fact[]>();
  for (const fact of kept.filter((item) => item.k === 'decision')) {
    const key = norm(fact.d || fact.v);
    const list = decisionGroups.get(key) ?? [];
    list.push(fact);
    decisionGroups.set(key, list);
  }
  const decisions = [...decisionGroups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => (a.t ?? '').localeCompare(b.t ?? ''));
    const latest = ordered[ordered.length - 1];
    const earlier = ordered.length > 1 ? ordered[0] : null;
    const cited = citeGroup([latest], input.local.lastAt, false);
    return {
      ...cited,
      question: latest.d || latest.v,
      reversed: earlier && norm(earlier.v) !== norm(latest.v)
        ? { v: earlier.v, date: latest.t, ev: [latest.c] }
        : null,
    };
  });

  const contradictions: CaseFile['contradictions'] = [];
  const locationValues = selfFacts.filter((fact) => (fact.d ?? '').toLowerCase().includes('location'));
  if (new Set(locationValues.map((fact) => norm(fact.v))).size > 1) {
    const ordered = [...locationValues].sort((a, b) => (a.t ?? '').localeCompare(b.t ?? ''));
    contradictions.push({
      field: 'location',
      earlier: citeGroup([ordered[0]], input.local.lastAt, false),
      later: citeGroup([ordered[ordered.length - 1]], input.local.lastAt, false),
    });
  }

  const coverSource = input.narrative && toneOk(input.narrative.cover) ? input.narrative.cover : null;
  const narrativeStatus: NarrativeStatus = input.narrativeStatus === 'written' && !coverSource ? 'templated' : input.narrativeStatus;
  const cover = coverSource ?? templateCover({
    depth: input.depth,
    provider: input.provider,
    model: input.model,
    read: read.length,
    conversations: input.conversations.length,
    skipped: input.skippedIds.length,
  });
  const blurbs = coverSource && input.narrative ? input.narrative.blurbs : {};
  const safeBlurbs: Record<string, string> = {};
  for (const [key, value] of Object.entries(blurbs)) {
    if (toneOk(value)) safeBlurbs[key] = value;
  }

  const coverage = finalizeCoverage({
    conversations: input.conversations.length,
    planned: input.plannedIds.length,
    read: read.length,
    skipped: input.skippedIds.length,
    batches: input.batches,
    failed: input.failedIds.length,
    depth: input.depth,
    narrative: narrativeStatus,
    viaProxy: input.viaProxy,
    partial: Boolean(input.partialReason),
    partialReason: input.partialReason,
    dateRange: { first: input.local.firstAt, last: input.local.lastAt },
    topics: input.topics.filter((topic) => read.includes(topic.c)),
  });

  const modelRead = new Set(read);
  return {
    schema_version: '1.0',
    model: { provider: input.provider, id: input.model, depth: input.depth },
    coverage,
    subject: {
      nameGuess: subjectField('name'),
      location: subjectField('location'),
      occupation: subjectField('occupation') ?? subjectField('job'),
      languages: subjectField('language'),
    },
    people: [...peopleFromAi, ...peopleLocalOnly],
    places: ofKind('place', (value) => localPlaces.has(norm(value))),
    orgs: ofKind('org'),
    timeline: ofKind('event'),
    projects: ofKind('project'),
    routines: input.local.routines,
    interests: ofKind('interest'),
    beliefs: ofKind('belief'),
    worries: [...ofKind('worry'), ...ofKind('emotion')],
    health: ofKind('health'),
    money: ofKind('money'),
    decisions,
    open_loops: ofKind('loop'),
    contradictions,
    exposure: input.local.exposure,
    style: input.local.style,
    usage: input.local.usage,
    notable: input.local.notable.map((item) => ({ ...item, modelRead: modelRead.has(item.id) })),
    narrative: {
      cover,
      blurbs: safeBlurbs,
      ev: input.narrative?.ev ?? read.slice(0, 5),
    },
    supportNote: input.local.distress ? SUPPORT_NOTE : undefined,
    cardStatus: cardStates(input.depth),
  };
}

import nlp from 'compromise';
import type { NormalizedConversation } from '../conversationParser/types.ts';
import { mentionsDistress } from './checks.ts';
import { estimateTokens } from './tokens.ts';

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:^|\D)(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const URL = /\bhttps?:\/\/[^\s<>"']+/gi;
const KEY_LIKE = /\b(?:sk|rk|pk|AKIA|ghp|xox[baprs])-[A-Za-z0-9_-]{8,}\b/;
const HEALTH = /\b(diagnos\w*|symptom|medication|prescription|therap\w*|depressed|anxiety|anxious|hurts?|pain|knee|doctor|clinic|pregnant|cancer|surgery|\bmg\b)\b/i;
const MONEY = /\b(rent|salary|mortgage|debt|invoice|bank|budget|invest\w*|loan|tuition|wage|paycheck|\$\d)/i;
const SWEAR = /\b(damn|hell|shit|fuck|fucking|asshole)\b/i;
const STOP = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'you', 'your', 'have', 'from', 'just', 'about', 'what', 'when', 'how', 'can', 'would', 'could', 'there', 'their', 'they', 'them', 'was', 'were', 'are', 'but', 'not', 'its', 'it\'s']);

export interface LocalConversation {
  id: string;
  title: string;
  score: number;
  flagged: boolean;
  reasons: string[];
  userTokens: number;
  fullTokens: number;
  userText: string;
  userWords: number;
  questionMessages: number;
  userMessages: number;
  swearCount: number;
  emails: string[];
  phones: string[];
  cardLike: number;
  urls: number;
  keyLike: number;
  healthHits: number;
  moneyHits: number;
  people: string[];
  places: string[];
  orgs: string[];
  hours: number[];
  weekdays: number[];
  days: string[];
  createdAt: string | null;
  lastAt: string | null;
  sourceFormat: string;
  distress: boolean;
}

export interface LocalReport {
  conversations: LocalConversation[];
  exposure: {
    emails: string[];
    phones: string[];
    cardLike: number;
    urls: number;
    keyLike: number;
    ev: string[];
  };
  style: {
    wordsPerMessage: number;
    vocabulary: number;
    questionShare: number;
    swearCount: number;
    topPhrases: string[];
    userMessages: number;
    userWords: number;
  };
  routines: {
    hours: number[];
    weekdays: number[];
    peakHours: number[];
    lateNightShare: number;
    longestStreak: number;
  };
  usage: {
    providers: { name: string; count: number }[];
    byMonth: { month: string; count: number }[];
    longest: { id: string; title: string; messages: number }[];
  };
  notable: { id: string; title: string; score: number; reasons: string[] }[];
  distress: boolean;
  totals: {
    conversations: number;
    userTokens: number;
    fullTokens: number;
    flagged: number;
    messages: number;
  };
  firstAt: string | null;
  lastAt: string | null;
}

export function luhnOk(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    const folded = key.toLowerCase();
    if (!key || seen.has(folded)) continue;
    seen.add(folded);
    out.push(key);
  }
  return out;
}

function cleanName(raw: string): string | null {
  const caps = raw.split(/\s+/).filter((word) => /^[A-Z][a-z]{1,}$/.test(word));
  if (!caps.length) return null;
  return caps.slice(0, 3).join(' ');
}

function entities(text: string): { people: string[]; places: string[]; orgs: string[] } {
  const slice = text.slice(0, 20_000);
  try {
    const doc = nlp(slice);
    const people = doc.people().out('array') as string[];
    const places = doc.places().out('array') as string[];
    const orgs = doc.organizations().out('array') as string[];
    return {
      people: unique(people.map(cleanName).filter((item): item is string => Boolean(item))),
      places: unique(places.map(cleanName).filter((item): item is string => Boolean(item))),
      orgs: unique(orgs.map((item) => item.trim()).filter((item) => item.length > 1 && item.length < 60)),
    };
  } catch {
    return { people: [], places: [], orgs: [] };
  }
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function topPhrases(texts: string[]): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const words = wordsOf(text).filter((word) => word.length > 2 && !STOP.has(word));
    for (let i = 0; i < words.length - 1; i += 1) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

function longestStreak(days: string[]): number {
  const uniqueDays = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of uniqueDays) {
    const time = Date.parse(`${day}T00:00:00Z`);
    if (prev != null && time - prev === 86_400_000) run += 1;
    else run = 1;
    prev = time;
    if (run > best) best = run;
  }
  return best;
}

export function analyzeConversation(conversation: NormalizedConversation): LocalConversation {
  const userMessages = conversation.messages.filter((message) => message.role === 'user' && message.text.trim());
  const userText = userMessages.map((message) => message.text).join('\n');
  const fullText = conversation.messages.map((message) => message.text).join('\n');
  const emails = unique(userText.match(EMAIL) ?? []);
  const phones = unique((userText.match(PHONE) ?? []).map((phone) => phone.replace(/^[^\d+(]+/, '').trim()).filter((phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }));
  const cardLike = (userText.match(CARD) ?? []).filter((candidate) => luhnOk(candidate)).length;
  const named = entities(userText);
  const userWords = wordsOf(userText);
  const healthHits = HEALTH.test(userText) ? 1 : 0;
  const moneyHits = MONEY.test(userText) ? 1 : 0;
  const swearCount = (userText.match(new RegExp(SWEAR, 'gi')) ?? []).length;
  const distress = userMessages.some((message) => mentionsDistress(message.text));
  const hours: number[] = [];
  const weekdays: number[] = [];
  const days: string[] = [];
  let lastAt: string | null = null;
  for (const message of conversation.messages) {
    if (!message.timestamp) continue;
    const date = new Date(message.timestamp);
    if (Number.isNaN(date.getTime())) continue;
    hours.push(date.getUTCHours());
    weekdays.push(date.getUTCDay());
    days.push(date.toISOString().slice(0, 10));
    if (!lastAt || message.timestamp > lastAt) lastAt = message.timestamp;
  }
  let score = 0;
  const reasons: string[] = [];
  if (emails.length || phones.length || cardLike || KEY_LIKE.test(userText)) {
    score += 5;
    reasons.push('identifier');
  }
  if (healthHits) {
    score += 4;
    reasons.push('health');
  }
  if (moneyHits) {
    score += 3;
    reasons.push('money');
  }
  if (named.people.length) {
    score += 2;
    reasons.push('person');
  }
  if (userWords.length > 400) {
    score += 2;
    reasons.push('long');
  }
  if (userWords.length > 1200) score += 2;
  if (swearCount > 0 || distress || /\b(worried|worry|deadline)\b/i.test(userText)) {
    score += 3;
    reasons.push('intense');
  }
  if (/\b(i (?:work|live)|my job|i am a|i'm a)\b/i.test(userText)) {
    score += 4;
    reasons.push('self');
  }
  const flagged = reasons.some((reason) => reason === 'identifier' || reason === 'health' || reason === 'money' || reason === 'person' || reason === 'intense' || reason === 'long' || reason === 'self');
  return {
    id: conversation.id,
    title: conversation.title,
    score,
    flagged,
    reasons,
    userTokens: estimateTokens(userText),
    fullTokens: estimateTokens(fullText),
    userText,
    userWords: userWords.length,
    questionMessages: userMessages.filter((message) => message.text.includes('?')).length,
    userMessages: userMessages.length,
    swearCount,
    emails,
    phones,
    cardLike,
    urls: (userText.match(URL) ?? []).length,
    keyLike: (userText.match(new RegExp(KEY_LIKE.source, 'g')) ?? []).length,
    healthHits,
    moneyHits,
    people: named.people,
    places: named.places,
    orgs: named.orgs,
    hours,
    weekdays,
    days,
    createdAt: conversation.createdAt,
    lastAt,
    sourceFormat: conversation.sourceFormat,
    distress,
  };
}

export function runLocalPass(conversations: NormalizedConversation[]): LocalReport {
  const analyzed = conversations.map(analyzeConversation);
  const emails = unique(analyzed.flatMap((item) => item.emails));
  const phones = unique(analyzed.flatMap((item) => item.phones));
  const hours = Array.from({ length: 24 }, () => 0);
  const weekdays = Array.from({ length: 7 }, () => 0);
  const monthCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  const allDays: string[] = [];
  let userWords = 0;
  let userMessages = 0;
  let questionMessages = 0;
  let swearCount = 0;
  let timed = 0;
  let late = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  for (const item of analyzed) {
    userWords += item.userWords;
    userMessages += item.userMessages;
    questionMessages += item.questionMessages;
    swearCount += item.swearCount;
    providerCounts.set(item.sourceFormat, (providerCounts.get(item.sourceFormat) ?? 0) + 1);
    for (const hour of item.hours) {
      hours[hour] += 1;
      timed += 1;
      if (hour < 5) late += 1;
    }
    for (const day of item.weekdays) weekdays[day] += 1;
    allDays.push(...item.days);
    const stamp = item.createdAt ?? item.lastAt;
    if (stamp) {
      const month = stamp.slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
      if (!firstAt || stamp < firstAt) firstAt = stamp;
      if (!lastAt || stamp > lastAt) lastAt = stamp;
    }
  }
  const peakHours = hours
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .filter((item) => item.count > 0)
    .slice(0, 3)
    .map((item) => item.hour);
  const vocabulary = userWords === 0 ? 0 : new Set(analyzed.flatMap((item) => wordsOf(item.userText))).size / userWords;
  return {
    conversations: analyzed,
    exposure: {
      emails,
      phones,
      cardLike: analyzed.reduce((sum, item) => sum + item.cardLike, 0),
      urls: analyzed.reduce((sum, item) => sum + item.urls, 0),
      keyLike: analyzed.reduce((sum, item) => sum + item.keyLike, 0),
      ev: analyzed.filter((item) => item.emails.length || item.phones.length || item.cardLike || item.keyLike).map((item) => item.id),
    },
    style: {
      wordsPerMessage: userMessages ? Math.round(userWords / userMessages) : 0,
      vocabulary: Math.round(vocabulary * 1000) / 1000,
      questionShare: userMessages ? Math.round((questionMessages / userMessages) * 1000) / 1000 : 0,
      swearCount,
      topPhrases: topPhrases(analyzed.map((item) => item.userText)),
      userMessages,
      userWords,
    },
    routines: {
      hours,
      weekdays,
      peakHours,
      lateNightShare: timed ? Math.round((late / timed) * 1000) / 1000 : 0,
      longestStreak: longestStreak(allDays),
    },
    usage: {
      providers: [...providerCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      byMonth: [...monthCounts.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
      longest: [...analyzed]
        .sort((a, b) => b.userMessages - a.userMessages || a.id.localeCompare(b.id))
        .slice(0, 5)
        .map((item) => ({ id: item.id, title: item.title, messages: item.userMessages })),
    },
    notable: [...analyzed]
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, 8)
      .map((item) => ({ id: item.id, title: item.title, score: item.score, reasons: item.reasons })),
    distress: analyzed.some((item) => item.distress),
    totals: {
      conversations: analyzed.length,
      userTokens: analyzed.reduce((sum, item) => sum + item.userTokens, 0),
      fullTokens: analyzed.reduce((sum, item) => sum + item.fullTokens, 0),
      flagged: analyzed.filter((item) => item.flagged).length,
      messages: conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
    },
    firstAt,
    lastAt,
  };
}

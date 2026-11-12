const TONE_BAD = [
  /\b(idiot|stupid|pathetic|disgusting|loser|worthless|trash)\b/i,
  /\byou should be ashamed\b/i,
  /\b(slut|whore|retard)\b/i,
];

const MAX_NARRATIVE = 900;

export function normalizeQuote(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** A quote must show up in the cited conversation. Null quotes are allowed and checked later via confidence. */
export function quoteAppears(quote: string | null | undefined, sources: string[]): boolean {
  if (!quote || !quote.trim()) return true;
  const needle = normalizeQuote(quote);
  if (needle.length < 2) return false;
  return sources.some((source) => normalizeQuote(source).includes(needle));
}

export function toneProblems(text: string): string[] {
  const problems: string[] = [];
  if (text.length > MAX_NARRATIVE) problems.push('too long');
  for (const pattern of TONE_BAD) {
    if (pattern.test(text)) problems.push('tone');
  }
  return problems;
}

export function toneOk(text: string): boolean {
  return toneProblems(text).length === 0;
}

export const DISTRESS_PATTERN =
  /\b(suicid\w*|kill myself|self[- ]harm|end my life|don'?t want to (?:be here|live)|want to die|hopeless)\b/i;

export const SUPPORT_NOTE =
  'Some of these chats mention distress. If you want someone to talk to, call or text 988 in the US, or find a local line at https://www.iasp.info/suicidalthoughts/.';

export function mentionsDistress(text: string): boolean {
  return DISTRESS_PATTERN.test(text);
}

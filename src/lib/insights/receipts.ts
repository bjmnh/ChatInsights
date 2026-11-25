export interface QuoteHit {
  messageIndex: number;
  start: number;
  end: number;
}

export const RECEIPT_MISSING = 'This export is not on this device, so the source chat cannot be opened. Re-attach the same export. It is matched by fingerprint and stays in this browser. It is not uploaded.';
export const RECEIPT_CHAT_MISSING = 'That chat is not in the export attached on this device.';
export const ATTACH_MISMATCH = 'That file does not match this report. Re-attach the same export.';

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Map a hit in the whitespace-collapsed text back onto the original string. */
function spanInOriginal(text: string, squashedNeedle: string): { start: number; end: number } | null {
  const folded = text.toLowerCase();
  let built = '';
  const map: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < folded.length; index += 1) {
    const char = folded[index];
    if (/\s/.test(char)) {
      if (built.length) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      map.push(index);
      built += ' ';
      pendingSpace = false;
    }
    map.push(index);
    built += char;
  }
  const at = built.indexOf(squashedNeedle);
  if (at < 0 || !map.length) return null;
  const start = map[at];
  const endIndex = Math.min(built.length - 1, at + squashedNeedle.length - 1);
  return { start, end: map[endIndex] + 1 };
}

export function locateQuote(messages: { text: string }[], quote: string | null | undefined): QuoteHit | null {
  const needle = (quote ?? '').replace(/\s+/g, ' ').trim();
  if (needle.length < 2) return null;
  const direct = needle.toLowerCase();
  for (let index = 0; index < messages.length; index += 1) {
    const at = messages[index].text.toLowerCase().indexOf(direct);
    if (at >= 0) return { messageIndex: index, start: at, end: at + direct.length };
  }
  const squashedNeedle = squash(needle);
  for (let index = 0; index < messages.length; index += 1) {
    const span = spanInOriginal(messages[index].text, squashedNeedle);
    if (span) return { messageIndex: index, ...span };
  }
  const words = squashedNeedle.split(' ').filter((word) => word.length > 3);
  if (words.length < 3) return null;
  let best: { index: number; score: number } | null = null;
  for (let index = 0; index < messages.length; index += 1) {
    const hay = squash(messages[index].text);
    const hits = words.filter((word) => hay.includes(word)).length;
    const score = hits / words.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { index, score };
  }
  if (!best) return null;
  const text = messages[best.index].text;
  const folded = text.toLowerCase();
  const present = words.filter((word) => folded.includes(word));
  const start = folded.indexOf(present[0]);
  const last = present[present.length - 1];
  const end = folded.indexOf(last) + last.length;
  return { messageIndex: best.index, start, end: Math.max(end, start + 1) };
}

export function attachResult(actual: string, expected: string | null | undefined): 'match' | 'mismatch' | 'missing' {
  if (!expected) return 'missing';
  return actual === expected ? 'match' : 'mismatch';
}

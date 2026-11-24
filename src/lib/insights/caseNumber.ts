/** Stable four-digit case number from a report seed. Same seed always prints the same file number. */
export function caseFileNumber(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const value = (hash >>> 0) % 9000 + 1000;
  return `CI-${value}`;
}

/** A number for this read. A retry keeps it: the run id does not change when the cover is rewritten. */
export function caseNumberFor(file: {
  runId?: string;
  filedAt?: string;
  coverage: { conversations: number; topics: { c: string }[] };
}, conversationIds: string[] = []): string {
  if (file.runId) return caseFileNumber(file.runId);
  const ids = (conversationIds.length ? conversationIds : file.coverage.topics.map((topic) => topic.c)).join(',');
  return caseFileNumber([file.filedAt ?? '', ids, String(file.coverage.conversations)].join('|'));
}

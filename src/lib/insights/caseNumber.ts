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

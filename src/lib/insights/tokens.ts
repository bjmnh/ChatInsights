/** Local token estimate. Four characters per token, which is enough for a pre-run cost range. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

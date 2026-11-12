/** Hosts the pass-through is allowed to call. Unknown custom base URLs stay in the browser. */
export const PROXY_HOSTS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.x.ai',
  'openrouter.ai',
  'api.groq.com',
  'api.together.xyz',
  'api.together.ai',
  'api.deepseek.com',
  'api.venice.ai',
] as const;

export const PROXY_PATH_PREFIXES = ['/v1/', '/v1beta/', '/api/v1/', '/openai/v1/'];

const PRIVATE_HOST = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^metadata\.google\.internal$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fe80:/i,
  /^fc/i,
  /^fd/i,
];

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

export function isPrivateHost(host: string): boolean {
  const bare = normalizeHost(host).replace(/^\[|\]$/g, '');
  if (!bare || bare.includes(':') && !bare.includes('.')) {
    // IPv6 literal
    const v6 = bare.replace(/^\[|\]$/g, '');
    if (PRIVATE_HOST.some((pattern) => pattern.test(v6))) return true;
  }
  if (PRIVATE_HOST.some((pattern) => pattern.test(bare))) return true;
  // Decimal or shortened IPv4 that points at loopback or the private ranges.
  if (/^\d+$/.test(bare)) return true;
  return false;
}

export function isAllowlistedHost(host: string, extra: string[] = []): boolean {
  const name = normalizeHost(host);
  if (!/^[a-z0-9.-]+$/.test(name)) return false;
  if (isPrivateHost(name)) return false;
  const allowed = new Set<string>([...PROXY_HOSTS, ...extra.map(normalizeHost)]);
  return allowed.has(name);
}

export function isProxyCandidate(host: string, extra?: string[]): boolean {
  return isAllowlistedHost(host, extra);
}

export function isAllowedProxyPath(path: string): boolean {
  if (!path.startsWith('/') || path.includes('..') || path.includes('\\') || path.includes('//')) return false;
  if (!/^\/[a-zA-Z0-9._/-]*$/.test(path.split('?')[0])) return false;
  const pathname = path.split('?')[0];
  return PROXY_PATH_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));
}

export function parseExtraAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => normalizeHost(item))
    .filter((item) => item && !isPrivateHost(item) && /^[a-z0-9.-]+$/.test(item));
}

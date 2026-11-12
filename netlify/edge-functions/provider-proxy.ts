import { handleProxyRequest } from '../../src/lib/insights/proxyHandler.ts';
import { parseExtraAllowlist } from '../../src/lib/insights/proxyPolicy.ts';

interface EdgeContext {
  ip?: string;
}

function allowlistExtra(): string {
  const netlify = (globalThis as { Netlify?: { env?: { get?: (name: string) => string | undefined } } }).Netlify;
  return netlify?.env?.get?.('PROVIDER_PROXY_ALLOWLIST') ?? '';
}

export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  return handleProxyRequest(request, {
    ip: context?.ip || request.headers.get('x-nf-client-connection-ip') || 'unknown',
    extraAllowlist: parseExtraAllowlist(allowlistExtra()),
  });
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleProviderKeys } from '../../../src/lib/providerKeys/handler.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const response = await handleProviderKeys(request, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  });
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
});

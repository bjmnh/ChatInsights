// Get the frontend URL from environment variable or default to localhost
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

export const corsHeaders = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

export const handleError = (error: Error, context: string) => {
  console.error(`${context}:`, error);
  return new Response(
    JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      context 
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
};
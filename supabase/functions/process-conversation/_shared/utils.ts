// Helper function to safely get environment variables
export const getEnv = (key: string, defaultValue: string): string => {
  try {
    // @ts-expect-error - Deno.env.get is valid in Deno
    return Deno.env.get(key) ?? defaultValue;
  } catch (e) {
    console.warn(`Failed to access environment variable ${key}:`, e);
    return defaultValue;
  }
};

// Get the frontend URL from environment variable or default to production URL
const FRONTEND_URL = getEnv('FRONTEND_URL', 'https://chatinsights.online');

// Configure CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Handle errors consistently with CORS headers
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
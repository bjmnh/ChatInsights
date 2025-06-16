// App configuration that adapts to environment
export const config = {
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    name: 'ChatInsights',
    supportEmail: 'support@chatinsights.com',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  // Helper to get the correct redirect URLs
  getRedirectUrl: (path: string) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}${path}`;
  },
  // Helper to determine if we're in production
  isProduction: () => {
    return import.meta.env.PROD || window.location.hostname !== 'localhost';
  },
};
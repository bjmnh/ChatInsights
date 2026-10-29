// App configuration that adapts to environment
export const config = {
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    name: 'ChatInsights',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  auth: {
    google: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
    apple: import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true',
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
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_ENABLE_GOOGLE_AUTH?: string;
  readonly VITE_ENABLE_APPLE_AUTH?: string;
  /** Optional tip-jar URL. Hidden when unset. */
  readonly VITE_DONATION_URL?: string;
  /** Extra pass-through hosts, comma-separated. Must match PROVIDER_PROXY_ALLOWLIST on Netlify. */
  readonly VITE_PROXY_ALLOWLIST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

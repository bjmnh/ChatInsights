export interface ModelPrice {
  provider: string;
  id: string;
  label: string;
  input: number;
  output: number;
  context: number;
  default?: boolean;
}

/** Public list prices as of Nov 11, 2026. The bill can differ, especially with thinking tokens. */
export const PRICE_AS_OF = 'Nov 11, 2026';

export const MODEL_CATALOG: ModelPrice[] = [
  { provider: 'gemini', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', input: 0.3, output: 2.5, context: 1_000_000, default: true },
  { provider: 'gemini', id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', input: 0.75, output: 3.75, context: 1_000_000 },
  { provider: 'openai', id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', input: 0.2, output: 1.2, context: 128_000, default: true },
  { provider: 'openai', id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', input: 0.75, output: 4.5, context: 128_000 },
  { provider: 'anthropic', id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, context: 200_000, default: true },
  { provider: 'anthropic', id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, context: 200_000 },
  { provider: 'xai', id: 'grok-4.3', label: 'Grok 4.3', input: 1.25, output: 2.5, context: 131_072, default: true },
];

export function catalogModel(provider: string, id: string): ModelPrice | undefined {
  return MODEL_CATALOG.find((model) => model.provider === provider && model.id === id);
}

export function defaultModel(provider: string): ModelPrice | undefined {
  return MODEL_CATALOG.find((model) => model.provider === provider && model.default) ?? MODEL_CATALOG.find((model) => model.provider === provider);
}

export interface ProviderPreset {
  id: string;
  label: string;
  kind: 'gemini' | 'openai' | 'anthropic' | 'xai' | 'compatible' | 'demo';
  baseUrl?: string;
  local?: boolean;
  dataUse: string;
  termsUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    kind: 'gemini',
    dataUse:
      'Unpaid Gemini quota: Google may use prompts and responses to improve its products, and reviewers may read them. Paid Gemini API services: Google says it does not use prompts or responses to improve products, but it still logs them for a limited time to detect abuse. This is a summary, not a promise from Chat Insights.',
    termsUrl: 'https://ai.google.dev/gemini-api/terms',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    dataUse:
      'OpenAI’s API data controls depend on your account. A failed call (a typo in the key, for example) can omit CORS headers and look like a network error. Check the current API data usage policy.',
    termsUrl: 'https://openai.com/policies/api-data-usage-policies',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    dataUse:
      'The browser call sends Anthropic’s direct-browser header, because this is your key. Organizations with zero data retention or the Compliance API can still get a 401 on browser calls. Those fall back to the pass-through, which does not forward the browser Origin header. Anthropic’s commercial terms apply.',
    termsUrl: 'https://www.anthropic.com/legal/commercial-terms',
  },
  {
    id: 'xai',
    label: 'xAI',
    kind: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    dataUse:
      'xAI’s API terms apply to what you send. If the browser call is blocked, an allowlisted pass-through is offered and the progress screen says so.',
    termsUrl: 'https://x.ai/legal/privacy-policy',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    dataUse: 'OpenRouter’s terms and the downstream model’s terms both apply. Prices vary by model.',
    termsUrl: 'https://openrouter.ai/terms',
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    dataUse: 'Groq’s API terms apply. Free-tier keys are paced one batch at a time.',
    termsUrl: 'https://groq.com/terms-of-use/',
  },
  {
    id: 'together',
    label: 'Together',
    kind: 'compatible',
    baseUrl: 'https://api.together.xyz/v1',
    dataUse: 'Together’s API terms apply to what you send.',
    termsUrl: 'https://www.together.ai/terms-of-service',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    dataUse: 'DeepSeek’s API terms apply to what you send.',
    termsUrl: 'https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html',
  },
  {
    id: 'venice',
    label: 'Venice',
    kind: 'compatible',
    baseUrl: 'https://api.venice.ai/api/v1',
    dataUse: 'Venice’s API terms apply to what you send.',
    termsUrl: 'https://venice.ai/legal/tos',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    kind: 'compatible',
    baseUrl: 'http://localhost:11434/v1',
    local: true,
    dataUse:
      'Ollama is called from your browser at the base URL you set. It is never sent through the Chat Insights pass-through. Set OLLAMA_ORIGINS to include this site if the browser blocks it.',
    termsUrl: 'https://docs.ollama.com/faq',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    kind: 'compatible',
    baseUrl: 'http://localhost:1234/v1',
    local: true,
    dataUse:
      'LM Studio is called from your browser. It is never sent through the Chat Insights pass-through. Turn on its CORS switch if the browser blocks the call.',
    termsUrl: 'https://lmstudio.ai/docs/app/api',
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible',
    kind: 'compatible',
    dataUse:
      'This host is whoever runs the base URL you enter. Chat Insights does not control their retention. Unknown hosts are called from the browser only. They are not added to the pass-through.',
    termsUrl: '',
  },
  {
    id: 'demo',
    label: 'Demo extractor',
    kind: 'demo',
    dataUse:
      'The demo extractor runs in this browser. It is not a language model and it does not send your chats anywhere. Use it to see the report layout.',
    termsUrl: '',
  },
];

export function providerPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((provider) => provider.id === id);
}

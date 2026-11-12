import { schemaFor, toGeminiSchema } from './schema.ts';
import {
  isSchemaRejection,
  providerFetch,
  ProviderRequestError,
  throwForStatus,
  type FetchLike,
} from './transport.ts';

export interface CompleteRequest {
  system: string;
  user: string;
  schemaName: string;
  maxOutputTokens: number;
}

export interface CompleteResult {
  text: string;
  viaProxy: boolean;
  usage?: { input: number; output: number };
}

export interface ListedModel {
  id: string;
}

export interface TestResult {
  ok: boolean;
  models: ListedModel[];
  message: string;
}

export interface Adapter {
  id: string;
  complete(request: CompleteRequest): Promise<CompleteResult>;
  testConnection?: () => Promise<TestResult>;
}

export interface AdapterOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  proxy?: 'auto' | 'never';
  extraAllowlist?: string[];
}

type Strategy = 'json_schema' | 'json_object' | 'tool' | 'prompt';

function usageOf(value: unknown): { input: number; output: number } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const input = Number(record.prompt_tokens ?? record.input_tokens ?? 0);
  const output = Number(record.completion_tokens ?? record.output_tokens ?? 0);
  if (!input && !output) return undefined;
  return { input, output };
}

async function postJson(
  url: string,
  headers: HeadersInit,
  body: unknown,
  options: AdapterOptions,
): Promise<{ status: number; text: string; viaProxy: boolean; json: unknown; headers: Headers }> {
  const result = await providerFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }, options);
  let json: unknown = null;
  try {
    json = result.text ? JSON.parse(result.text) : null;
  } catch {
    json = null;
  }
  return { status: result.response.status, text: result.text, viaProxy: result.viaProxy, json, headers: result.response.headers };
}

function openAiText(payload: unknown): { text: string; safety: boolean } {
  const record = payload as { choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: { function?: { arguments?: string } }[] } }[] };
  const choice = record?.choices?.[0];
  if (choice?.finish_reason === 'content_filter') return { text: '', safety: true };
  const tool = choice?.message?.tool_calls?.[0]?.function?.arguments;
  if (tool) return { text: tool, safety: false };
  return { text: choice?.message?.content ?? '', safety: false };
}

export function createOpenAICompatibleAdapter(id: string, options: AdapterOptions): Adapter {
  const base = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  let strategy: Strategy | null = null;
  const strategies: Strategy[] = ['json_schema', 'json_object', 'tool', 'prompt'];

  async function once(request: CompleteRequest, mode: Strategy) {
    const schema = schemaFor(request.schemaName);
    const body: Record<string, unknown> = {
      model: options.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    };
    if (mode === 'json_schema') {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: request.schemaName, strict: true, schema },
      };
    } else if (mode === 'json_object') {
      body.response_format = { type: 'json_object' };
    } else if (mode === 'tool') {
      body.tools = [{ type: 'function', function: { name: request.schemaName, parameters: schema } }];
      body.tool_choice = { type: 'function', function: { name: request.schemaName } };
    }
    return postJson(`${base}/chat/completions`, { authorization: `Bearer ${options.apiKey}` }, body, options);
  }

  return {
    id,
    async testConnection() {
      const result = await providerFetch(`${base}/models`, {
        method: 'GET',
        headers: { authorization: `Bearer ${options.apiKey}` },
      }, options);
      if (result.response.status === 401 || result.response.status === 403) {
        return { ok: false, models: [], message: 'That key was rejected.' };
      }
      if (!result.response.ok) {
        return { ok: false, models: [], message: `Model list returned ${result.response.status}.` };
      }
      const payload = JSON.parse(result.text) as { data?: { id?: string }[] };
      const models = (payload.data ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)).map((modelId) => ({ id: modelId }));
      return { ok: true, models, message: models.length ? `Key works. ${models.length} models listed.` : 'Key works.' };
    },
    async complete(request) {
      const order = strategy ? [strategy, ...strategies.filter((item) => item !== strategy)] : strategies;
      let lastError = 'The provider rejected structured output.';
      for (const mode of order) {
        const result = await once(request, mode);
        if (isSchemaRejection(result.status, result.text) && mode !== 'prompt') {
          lastError = result.text;
          continue;
        }
        throwForStatus(result.status, result.text, result.headers);
        const extracted = openAiText(result.json);
        if (extracted.safety) throw new ProviderRequestError('The provider safety filter blocked this batch.', result.status, 'safety');
        strategy = mode;
        const usage = usageOf((result.json as { usage?: unknown })?.usage);
        return { text: extracted.text, viaProxy: result.viaProxy, usage };
      }
      throw new ProviderRequestError(lastError, 400, 'schema');
    },
  };
}

export function createGeminiAdapter(options: AdapterOptions): Adapter {
  let useSchema = true;
  const root = 'https://generativelanguage.googleapis.com/v1beta';
  return {
    id: 'gemini',
    async testConnection() {
      const result = await providerFetch(`${root}/models`, {
        method: 'GET',
        headers: { 'x-goog-api-key': options.apiKey },
      }, options);
      if (result.response.status === 401 || result.response.status === 403 || result.response.status === 400) {
        return { ok: false, models: [], message: 'That key was rejected.' };
      }
      if (!result.response.ok) return { ok: false, models: [], message: `Model list returned ${result.response.status}.` };
      const payload = JSON.parse(result.text) as { models?: { name?: string }[] };
      const models = (payload.models ?? [])
        .map((item) => item.name?.replace(/^models\//, '') ?? '')
        .filter(Boolean)
        .map((id) => ({ id }));
      return { ok: true, models, message: models.length ? `Key works. ${models.length} models listed.` : 'Key works.' };
    },
    async complete(request) {
      const generationConfig: Record<string, unknown> = {
        temperature: 0.2,
        maxOutputTokens: request.maxOutputTokens,
        responseMimeType: 'application/json',
      };
      if (useSchema) generationConfig.responseSchema = toGeminiSchema(schemaFor(request.schemaName));
      const send = (config: Record<string, unknown>) => postJson(
        `${root}/models/${encodeURIComponent(options.model)}:generateContent`,
        { 'x-goog-api-key': options.apiKey },
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.user }] }],
          generationConfig: config,
        },
        options,
      );
      let result = await send(generationConfig);
      if (useSchema && isSchemaRejection(result.status, result.text)) {
        useSchema = false;
        const fallback = { ...generationConfig };
        delete fallback.responseSchema;
        result = await send(fallback);
      }
      throwForStatus(result.status, result.text, result.headers);
      const payload = result.json as {
        promptFeedback?: { blockReason?: string };
        candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      if (payload.promptFeedback?.blockReason || payload.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new ProviderRequestError('The provider safety filter blocked this batch.', result.status, 'safety');
      }
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      const usage = payload.usageMetadata
        ? { input: payload.usageMetadata.promptTokenCount ?? 0, output: payload.usageMetadata.candidatesTokenCount ?? 0 }
        : undefined;
      return { text, viaProxy: result.viaProxy, usage };
    },
  };
}

export const ANTHROPIC_BROWSER_HEADER = 'anthropic-dangerous-direct-browser-access';

export function createAnthropicAdapter(options: AdapterOptions): Adapter {
  const base = (options.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
  let mode: 'json_schema' | 'tool' | 'prompt' = 'json_schema';
  const headers = {
    'x-api-key': options.apiKey,
    'anthropic-version': '2023-06-01',
    [ANTHROPIC_BROWSER_HEADER]: 'true',
  };

  async function send(request: CompleteRequest, next: typeof mode) {
    const schema = schemaFor(request.schemaName);
    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: request.maxOutputTokens,
      temperature: 0.2,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
    };
    if (next === 'json_schema') body.output_config = { format: { type: 'json_schema', schema } };
    if (next === 'tool') {
      body.tools = [{ name: request.schemaName, input_schema: schema }];
      body.tool_choice = { type: 'tool', name: request.schemaName };
    }
    return postJson(`${base}/messages`, headers, body, options);
  }

  return {
    id: 'anthropic',
    async testConnection() {
      const listed = await providerFetch(`${base}/models`, { method: 'GET', headers }, options);
      if (listed.response.ok) {
        const payload = JSON.parse(listed.text) as { data?: { id?: string }[] };
        const models = (payload.data ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)).map((id) => ({ id }));
        return { ok: true, models, message: 'Key works.' };
      }
      if (listed.response.status === 401 || listed.response.status === 403) {
        return { ok: false, models: [], message: 'That key was rejected. A zero-retention org may be blocking browser calls; the read can fall back to the pass-through.' };
      }
      return { ok: false, models: [], message: `Model list returned ${listed.response.status}.` };
    },
    async complete(request) {
      const order: Array<typeof mode> = mode === 'json_schema' ? ['json_schema', 'tool', 'prompt'] : [mode, 'prompt'];
      let last = '';
      for (const next of order) {
        const result = await send(request, next);
        if (isSchemaRejection(result.status, result.text) && next !== 'prompt') {
          last = result.text;
          continue;
        }
        throwForStatus(result.status, result.text, result.headers);
        const payload = result.json as {
          stop_reason?: string;
          content?: { type?: string; text?: string; input?: unknown }[];
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        if (payload.stop_reason === 'refusal') {
          throw new ProviderRequestError('The provider declined this batch.', result.status, 'safety');
        }
        mode = next;
        const block = payload.content?.find((item) => item.type === 'tool_use' && item.input) ?? payload.content?.find((item) => item.text);
        const text = block?.input ? JSON.stringify(block.input) : block?.text ?? '';
        return {
          text,
          viaProxy: result.viaProxy,
          usage: payload.usage ? { input: payload.usage.input_tokens ?? 0, output: payload.usage.output_tokens ?? 0 } : undefined,
        };
      }
      throw new ProviderRequestError(last || 'Structured output was rejected', 400, 'schema');
    },
  };
}

export function createAdapter(providerId: string, options: AdapterOptions): Adapter {
  if (providerId === 'gemini') return createGeminiAdapter(options);
  if (providerId === 'anthropic') return createAnthropicAdapter(options);
  return createOpenAICompatibleAdapter(providerId, options);
}

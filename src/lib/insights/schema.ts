import { z } from 'zod';

/** Fixed fact kinds. The sensitive buckets are the ones a blunt prompt tended to skip. */
export const FACT_KINDS = [
  'person',
  'place',
  'org',
  'event',
  'project',
  'interest',
  'belief',
  'worry',
  'health',
  'money',
  'decision',
  'loop',
  'self',
  'relationship',
  'substance',
  'legal',
  'work',
  'pii',
  'emotion',
] as const;

export type FactKind = (typeof FACT_KINDS)[number];

const nullableText = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

export const factSchema = z
  .object({
    c: z.string().trim().min(1),
    k: z.enum(FACT_KINDS),
    v: z.string().trim().min(1),
    d: nullableText,
    t: nullableText,
    q: nullableText,
  })
  .strip();

export const convSchema = z
  .object({
    c: z.string().trim().min(1),
    topic: z.string().trim().min(1).catch('untitled'),
  })
  .strip();

export const batchSchema = z
  .object({
    convs: z.array(convSchema),
    facts: z.array(factSchema),
  })
  .strip();

export type Fact = z.infer<typeof factSchema>;
export type BatchExtract = z.infer<typeof batchSchema>;

export const narrativeSchema = z
  .object({
    cover: z.string().trim().min(1),
    blurbs: z.record(z.string(), z.string()).optional().default({}),
    ev: z.array(z.string()).optional().default([]),
  })
  .strip();

export type NarrativeDraft = z.infer<typeof narrativeSchema>;

export const verifySchema = z
  .object({
    drop: z.array(z.number().int().nonnegative()).optional().default([]),
    notes: z.array(z.string()).optional().default([]),
  })
  .strip();

export type VerifyDraft = z.infer<typeof verifySchema>;

const factJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    c: { type: 'string' },
    k: { type: 'string', enum: [...FACT_KINDS] },
    v: { type: 'string' },
    d: { type: ['string', 'null'] },
    t: { type: ['string', 'null'] },
    q: { type: ['string', 'null'] },
  },
  required: ['c', 'k', 'v', 'd', 't', 'q'],
} as const;

export const BATCH_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    convs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          c: { type: 'string' },
          topic: { type: 'string' },
        },
        required: ['c', 'topic'],
      },
    },
    facts: { type: 'array', items: factJsonSchema },
  },
  required: ['convs', 'facts'],
};

export const NARRATIVE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cover: { type: 'string' },
    blurbs: { type: 'object', additionalProperties: { type: 'string' } },
    ev: { type: 'array', items: { type: 'string' } },
  },
  required: ['cover', 'blurbs', 'ev'],
};

export const VERIFY_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    drop: { type: 'array', items: { type: 'integer' } },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['drop', 'notes'],
};

export function schemaFor(name: string): Record<string, unknown> {
  if (name === 'narrative') return NARRATIVE_JSON_SCHEMA;
  if (name === 'verify') return VERIFY_JSON_SCHEMA;
  return BATCH_JSON_SCHEMA;
}

/** Gemini's responseSchema wants uppercase type names and nullable instead of unions. */
export function toGeminiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return { type: 'STRING' };
  const node = schema as Record<string, unknown>;
  if (Array.isArray(node.type)) {
    const primary = node.type.find((item) => item !== 'null');
    return {
      type: String(primary ?? 'STRING').toUpperCase(),
      nullable: node.type.includes('null'),
      ...(Array.isArray(node.enum) ? { enum: node.enum } : {}),
    };
  }
  if (node.type === 'object') {
    const properties: Record<string, unknown> = {};
    const source = (node.properties ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(source)) properties[key] = toGeminiSchema(value);
    return {
      type: 'OBJECT',
      properties,
      ...(Array.isArray(node.required) ? { required: node.required } : {}),
    };
  }
  if (node.type === 'array') {
    return { type: 'ARRAY', items: toGeminiSchema(node.items) };
  }
  const result: Record<string, unknown> = { type: String(node.type ?? 'STRING').toUpperCase() };
  if (Array.isArray(node.enum)) result.enum = node.enum;
  return result;
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object found');
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function salvageBatch(value: unknown): BatchExtract | null {
  if (!isRecord(value) || !Array.isArray(value.facts)) return null;
  const convs = (Array.isArray(value.convs) ? value.convs : []).flatMap((item) => {
    const parsed = convSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const facts = value.facts.flatMap((item) => {
    const parsed = factSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  if (value.facts.length > 0 && facts.length === 0) return null;
  const parsed = batchSchema.safeParse({ convs, facts });
  return parsed.success ? parsed.data : null;
}

export type ParseBatchResult =
  | { ok: true; value: BatchExtract; droppedFacts: number }
  | { ok: false; error: string };

export function parseBatchPayload(text: string): ParseBatchResult {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
  const direct = batchSchema.safeParse(json);
  if (direct.success) return { ok: true, value: direct.data, droppedFacts: 0 };
  const salvaged = salvageBatch(json);
  if (salvaged) {
    const original = isRecord(json) && Array.isArray(json.facts) ? json.facts.length : salvaged.facts.length;
    return { ok: true, value: salvaged, droppedFacts: Math.max(0, original - salvaged.facts.length) };
  }
  return { ok: false, error: direct.error.issues.map((issue) => issue.message).join('; ') || 'Schema validation failed' };
}

export function parseNarrativePayload(text: string): { ok: true; value: NarrativeDraft } | { ok: false; error: string } {
  try {
    const parsed = narrativeSchema.safeParse(extractJson(text));
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    return { ok: true, value: parsed.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function parseVerifyPayload(text: string): { ok: true; value: VerifyDraft } | { ok: false; error: string } {
  try {
    const parsed = verifySchema.safeParse(extractJson(text));
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    return { ok: true, value: parsed.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function buildRepairPrompt(invalid: string, error: string): string {
  const clipped = invalid.slice(0, 6000);
  return [
    'The previous response was not valid for the schema.',
    `Validator error: ${error}`,
    'Return only one JSON object with "convs" and "facts". Do not add commentary.',
    'Keep only facts you can support. Use null for unknown d, t, and q.',
    'Invalid response follows:',
    clipped,
  ].join('\n');
}

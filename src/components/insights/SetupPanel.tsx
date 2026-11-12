import React from 'react';
import { DEPTHS, type DepthId } from '../../lib/insights/depth';
import { formatCost, formatMinutes, formatTokens, type Estimate } from '../../lib/insights/estimate';
import { CONSENT_POINTS } from '../../lib/insights/copy';
import { MODEL_CATALOG, PRICE_AS_OF, PROVIDER_PRESETS, type ProviderPreset } from '../../lib/insights/prices';
import type { KeySummary } from '../../lib/insights/keyVault';

export interface SetupValues {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  inputPrice: string;
  outputPrice: string;
  depth: DepthId;
  quickFraction: number;
  maxDollars: string;
  maxTokens: string;
  consent: boolean;
  remember: boolean;
  passphrase: string;
}

const SetupPanel: React.FC<{
  values: SetupValues;
  onChange: (patch: Partial<SetupValues>) => void;
  estimate: Estimate;
  selected: number;
  total: number;
  flagged: number;
  preset: ProviderPreset;
  savedKeys: KeySummary[];
  testMessage: string;
  onTest: () => void;
  onRemember: () => void;
  onForget: (id: string) => void;
  onForgetAll: () => void;
  onUseSaved: (id: string) => void;
  onRun: () => void;
  busy: boolean;
}> = ({
  values, onChange, estimate, selected, total, flagged, preset, savedKeys,
  testMessage, onTest, onRemember, onForget, onForgetAll, onUseSaved, onRun, busy,
}) => {
  const models = MODEL_CATALOG.filter((model) => model.provider === values.providerId);
  const needsKey = preset.kind !== 'demo';
  return (
    <div data-testid="setup" className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-4xl">Key, model, depth</h2>
          <p className="mt-2 text-muted-foreground">Standard is selected unless you change it. Nothing is sent until you start the read.</p>
        </div>

        <label className="block text-sm">
          Provider
          <select
            className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
            value={values.providerId}
            onChange={(event) => onChange({ providerId: event.target.value })}
          >
            {PROVIDER_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        {preset.kind === 'compatible' && (
          <label className="block text-sm">
            Base URL
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              value={values.baseUrl}
              onChange={(event) => onChange({ baseUrl: event.target.value })}
              placeholder="https://api.example.com/v1"
              spellCheck={false}
            />
          </label>
        )}

        {needsKey && (
          <label className="block text-sm">
            API key
            <input
              type="password"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              value={values.apiKey}
              onChange={(event) => onChange({ apiKey: event.target.value })}
              placeholder="Stays in memory unless you opt in below"
            />
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onTest} className="rounded-full border border-white/15 px-4 py-2 text-sm">Test key</button>
          {testMessage && <p className="self-center text-sm text-muted-foreground">{testMessage}</p>}
        </div>

        <label className="block text-sm">
          Model
          <select
            className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
            value={models.some((model) => model.id === values.modelId) ? values.modelId : ''}
            onChange={(event) => onChange({ modelId: event.target.value })}
          >
            <option value="">Custom model id</option>
            {preset.kind === 'demo' && <option value="demo-extractor">demo-extractor</option>}
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.label}</option>
            ))}
          </select>
          <input
            className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
            value={values.modelId}
            onChange={(event) => onChange({ modelId: event.target.value })}
            placeholder="Model id"
            spellCheck={false}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Input price, $ / 1M tokens
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              inputMode="decimal"
              value={values.inputPrice}
              onChange={(event) => onChange({ inputPrice: event.target.value })}
            />
          </label>
          <label className="text-sm">
            Output price, $ / 1M tokens
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              inputMode="decimal"
              value={values.outputPrice}
              onChange={(event) => onChange({ outputPrice: event.target.value })}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Catalog prices are list prices as of {PRICE_AS_OF}. A local server can be $0. Thinking tokens are not in this estimate.</p>

        <fieldset>
          <legend className="text-sm">Depth</legend>
          <div className="mt-3 space-y-3">
            {DEPTHS.map((depth) => (
              <label key={depth.id} className="flex gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="radio"
                  name="depth"
                  className="mt-1"
                  checked={values.depth === depth.id}
                  onChange={() => onChange({ depth: depth.id })}
                />
                <span>
                  <span className="block font-medium">{depth.title}{depth.id === 'standard' ? ' · default' : ''}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{depth.summary}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {values.depth === 'quick' && (
          <label className="block text-sm">
            Quick slice: {Math.round(values.quickFraction * 100)}% of chats
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(values.quickFraction * 100)}
              onChange={(event) => onChange({ quickFraction: Number(event.target.value) / 100 })}
              className="mt-2 w-full"
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Stop after about $
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              inputMode="decimal"
              placeholder="No dollar cap"
              value={values.maxDollars}
              onChange={(event) => onChange({ maxDollars: event.target.value })}
            />
          </label>
          <label className="text-sm">
            Or stop after tokens
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
              inputMode="numeric"
              placeholder="No token cap"
              value={values.maxTokens}
              onChange={(event) => onChange({ maxTokens: event.target.value })}
            />
          </label>
        </div>

        {needsKey && (
          <div className="rounded-2xl border border-white/10 p-4">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={values.remember} onChange={(event) => onChange({ remember: event.target.checked })} />
              Remember on this device
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Off by default. The key is encrypted in this browser with AES-GCM. A non-extractable key stays on this device. An optional passphrase adds a layer if someone copies the profile. This does not protect against a script running on this site, or against malware. The key is never sent to our servers for storage.
            </p>
            {values.remember && (
              <label className="mt-3 block text-sm">
                Optional passphrase
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2"
                  value={values.passphrase}
                  onChange={(event) => onChange({ passphrase: event.target.value })}
                />
              </label>
            )}
            {values.remember && (
              <button type="button" onClick={onRemember} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-sm">
                Save key on this device
              </button>
            )}
            {savedKeys.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {savedKeys.map((key) => (
                  <li key={key.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{key.label} · {key.provider}{key.locked ? ' · passphrase' : ''}</span>
                    <span className="flex gap-2">
                      <button type="button" className="underline" onClick={() => onUseSaved(key.id)}>Use</button>
                      <button type="button" className="underline" onClick={() => onForget(key.id)}>Forget</button>
                    </span>
                  </li>
                ))}
                <li><button type="button" className="underline" onClick={onForgetAll}>Forget all keys</button></li>
              </ul>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 p-4 text-sm">
          <p className="font-medium">Before the run</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            {CONSENT_POINTS.map((point) => <li key={point}>{point}</li>)}
          </ul>
          {preset.dataUse && <p className="mt-4 text-muted-foreground">{preset.dataUse}</p>}
          {preset.termsUrl && (
            <a className="mt-2 inline-block text-primary underline" href={preset.termsUrl} target="_blank" rel="noreferrer">
              Provider terms
            </a>
          )}
          <label className="mt-4 flex items-start gap-3">
            <input type="checkbox" checked={values.consent} onChange={(event) => onChange({ consent: event.target.checked })} />
            <span>I confirm I am 18 or older, and the statements above.</span>
          </label>
        </div>

        <button
          type="button"
          data-testid="start-read"
          disabled={busy || !values.consent || !values.modelId || (needsKey && !values.apiKey.trim())}
          onClick={onRun}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Start the read
        </button>
      </div>

      <aside className="h-fit rounded-3xl border border-white/10 p-5" data-testid="estimate">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Estimate, before anything is sent</p>
        <p className="mt-4 font-display text-4xl">{formatCost(estimate.cost)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Approximate, with a 20% cushion for retries. Your provider bills you, not us.</p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt>Chats this depth sends</dt><dd>{selected} of {total}</dd></div>
          <div className="flex justify-between gap-4"><dt>Flagged locally</dt><dd>{flagged}</dd></div>
          <div className="flex justify-between gap-4"><dt>Input tokens</dt><dd>{formatTokens(estimate.inputTokens)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Output tokens</dt><dd>{formatTokens(estimate.outputTokens)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Calls</dt><dd>{estimate.calls}</dd></div>
          <div className="flex justify-between gap-4"><dt>Time</dt><dd>{formatMinutes(estimate.minutesLow, estimate.minutesHigh)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">One batch at a time, so a free-tier key can finish. It will just be slow. A hard cap stops after the last finished batch and labels the report partial.</p>
      </aside>
    </div>
  );
};

export default SetupPanel;

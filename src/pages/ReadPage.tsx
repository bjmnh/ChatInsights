import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { parseConversationExport, validateUploadFile } from '../lib/conversationParser';
import type { NormalizedConversation } from '../lib/conversationParser/types';
import { createAdapter } from '../lib/insights/adapters';
import { clearCheckpoint, idbVaultStore, loadCheckpoint, saveCheckpoint } from '../lib/insights/browserStore';
import { EXPORT_GUIDES } from '../lib/insights/copy';
import { selectConversations } from '../lib/insights/depth';
import { estimateRead } from '../lib/insights/estimate';
import { forgetAllKeys, forgetKey, listKeys, rememberKey, revealKey, type KeySummary } from '../lib/insights/keyVault';
import { runLocalPass, type LocalReport } from '../lib/insights/localPass';
import type { CaseFile } from '../lib/insights/merge';
import { parseExtraAllowlist } from '../lib/insights/proxyPolicy';
import { catalogModel, defaultModel, providerPreset } from '../lib/insights/prices';
import type { RunProgress } from '../lib/insights/runner';
import { runRead } from '../lib/insights/runner';
import { buildSampleConversations, createDemoAdapter } from '../lib/insights/sample';
import { exportFingerprint } from '../lib/insights/saveReport';
import { saveCaseFile } from '../services/caseFileService';
import ProgressView from '../components/insights/ProgressView';
import ReportView from '../components/insights/ReportView';
import SetupPanel, { type SetupValues } from '../components/insights/SetupPanel';
import ExportDropzone, { type UploadStage } from '../components/upload/ExportDropzone';
import { toast } from 'sonner';

const DEFAULT_SETUP: SetupValues = {
  providerId: 'gemini',
  baseUrl: '',
  apiKey: '',
  modelId: 'gemini-3.5-flash-lite',
  inputPrice: '0.30',
  outputPrice: '2.50',
  depth: 'standard',
  quickFraction: 0.1,
  maxDollars: '',
  maxTokens: '',
  consent: false,
  remember: false,
  passphrase: '',
};

function applyProvider(providerId: string, current: SetupValues): SetupValues {
  const preset = providerPreset(providerId);
  const model = defaultModel(providerId);
  const local = Boolean(preset?.local) || providerId === 'demo';
  return {
    ...current,
    providerId,
    baseUrl: preset?.baseUrl ?? '',
    modelId: providerId === 'demo' ? 'demo-extractor' : model?.id ?? current.modelId,
    inputPrice: local ? '0' : model ? String(model.input) : current.inputPrice,
    outputPrice: local ? '0' : model ? String(model.output) : current.outputPrice,
    apiKey: providerId === 'demo' ? '' : current.apiKey,
  };
}

const ReadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'drop' | 'preview' | 'setup' | 'run' | 'report'>('drop');
  const [stage, setStage] = useState<UploadStage>('idle');
  const [filename, setFilename] = useState('');
  const [conversations, setConversations] = useState<NormalizedConversation[]>([]);
  const [local, setLocal] = useState<LocalReport | null>(null);
  const [setup, setSetup] = useState<SetupValues>(DEFAULT_SETUP);
  const [savedKeys, setSavedKeys] = useState<KeySummary[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [paused, setPaused] = useState(false);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [resumeIds, setResumeIds] = useState<string[]>([]);
  const pausedRef = useRef(false);
  const sampleLoaded = useRef(false);

  const refreshKeys = useCallback(async () => {
    try {
      setSavedKeys(await listKeys(idbVaultStore()));
    } catch {
      setSavedKeys([]);
    }
  }, []);

  useEffect(() => {
    refreshKeys().catch(() => undefined);
    loadCheckpoint().then((checkpoint) => {
      if (!checkpoint || sampleLoaded.current) return;
      setConversations(checkpoint.conversations);
      setFilename(checkpoint.filename);
      setLocal(runLocalPass(checkpoint.conversations));
      setResumeIds(checkpoint.readIds);
      if (checkpoint.caseFile) {
        setCaseFile(checkpoint.caseFile);
        setStep('report');
      }
    }).catch(() => undefined);
  }, [refreshKeys]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sample') !== '1' || sampleLoaded.current) return;
    sampleLoaded.current = true;
    const sample = buildSampleConversations();
    setConversations(sample);
    setFilename('sample-not-a-real-person.json');
    setLocal(runLocalPass(sample));
    setStep('preview');
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const invalid = validateUploadFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setStage('reading');
    try {
      setStage('parsing');
      const parsed = await parseConversationExport(file.name, new Uint8Array(await file.arrayBuffer()));
      setStage('counting');
      setConversations(parsed.conversations);
      setFilename(file.name);
      setLocal(runLocalPass(parsed.conversations));
      setCaseFile(null);
      setResumeIds([]);
      setStep('preview');
      parsed.warnings.forEach((warning) => toast.message(warning));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read that export');
    } finally {
      setStage('idle');
    }
  }, []);

  const dropzone = useDropzone({ onDrop, multiple: false, disabled: stage !== 'idle' });

  const patchSetup = (patch: Partial<SetupValues>) => {
    setSetup((current) => {
      if (patch.providerId && patch.providerId !== current.providerId) return applyProvider(patch.providerId, { ...current, ...patch });
      if (patch.modelId && patch.modelId !== current.modelId) {
        const priced = catalogModel(current.providerId, patch.modelId);
        return {
          ...current,
          ...patch,
          inputPrice: priced ? String(priced.input) : current.inputPrice,
          outputPrice: priced ? String(priced.output) : current.outputPrice,
        };
      }
      return { ...current, ...patch };
    });
  };

  const preset = providerPreset(setup.providerId) ?? providerPreset('gemini')!;
  const selection = useMemo(
    () => (local ? selectConversations(local, setup.depth, setup.quickFraction) : null),
    [local, setup.depth, setup.quickFraction],
  );
  const chosen = useMemo(() => {
    if (!local || !selection) return [];
    const ids = new Set(selection.chosenIds);
    return local.conversations.filter((conversation) => ids.has(conversation.id));
  }, [local, selection]);
  const priced = catalogModel(setup.providerId, setup.modelId);
  const estimate = estimateRead({
    depth: setup.depth,
    conversationCount: chosen.length,
    userTokens: chosen.reduce((sum, item) => sum + item.userTokens, 0),
    fullTokens: chosen.reduce((sum, item) => sum + item.fullTokens, 0),
    contextWindow: priced?.context ?? (preset.local ? 8192 : 128_000),
    inputPricePerMillion: Number(setup.inputPrice) || 0,
    outputPricePerMillion: Number(setup.outputPrice) || 0,
    pacing: 'slow',
  });

  const remember = async () => {
    try {
      await rememberKey(idbVaultStore(), {
        provider: setup.providerId,
        label: preset.label,
        secret: setup.apiKey,
        passphrase: setup.passphrase || undefined,
      });
      setSetup((current) => ({ ...current, passphrase: '' }));
      await refreshKeys();
      toast.success('Key saved on this device');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the key');
    }
  };

  const loadSaved = async (id: string) => {
    const summary = savedKeys.find((key) => key.id === id);
    const passphrase = summary?.locked ? window.prompt('Passphrase for this key') ?? '' : undefined;
    try {
      const secret = await revealKey(idbVaultStore(), id, passphrase);
      setSetup((current) => ({ ...current, apiKey: secret, providerId: summary?.provider || current.providerId }));
      toast.success('Key loaded into memory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not unlock that key');
    }
  };

  const testKey = async () => {
    setTestMessage('Testing…');
    try {
      if (setup.providerId === 'demo') {
        const result = await createDemoAdapter().testConnection!();
        setTestMessage(result.message);
        return;
      }
      const adapter = createAdapter(setup.providerId, {
        apiKey: setup.apiKey.trim(),
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
      const result = await adapter.testConnection!();
      setTestMessage(result.message);
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : 'The test call failed');
    }
  };

  const start = async () => {
    if (!local) return;
    setStep('run');
    setPaused(false);
    pausedRef.current = false;
    setSaveMessage('');
    const adapter = setup.providerId === 'demo'
      ? createDemoAdapter({ latencyMs: 900 })
      : createAdapter(setup.providerId, {
        apiKey: setup.apiKey.trim(),
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
    const maxDollars = setup.maxDollars.trim() ? Number(setup.maxDollars) : undefined;
    const maxTokens = setup.maxTokens.trim() ? Number(setup.maxTokens) : undefined;
    try {
      const result = await runRead({
        conversations,
        local,
        depth: setup.depth,
        quickFraction: setup.quickFraction,
        model: {
          provider: setup.providerId,
          id: setup.modelId,
          inputPricePerMillion: Number(setup.inputPrice) || 0,
          outputPricePerMillion: Number(setup.outputPrice) || 0,
          contextWindow: priced?.context ?? (preset.local ? 8192 : 128_000),
        },
        budget: {
          maxDollars: Number.isFinite(maxDollars) ? maxDollars : undefined,
          maxTokens: Number.isFinite(maxTokens) ? maxTokens : undefined,
        },
        adapter,
        alreadyReadIds: resumeIds,
        isPaused: () => pausedRef.current,
        onProgress: setProgress,
      });
      setCaseFile(result);
      setStep('report');
      const fingerprint = await exportFingerprint(conversations);
      await saveCheckpoint({
        fingerprint,
        filename,
        depth: setup.depth,
        provider: setup.providerId,
        model: setup.modelId,
        conversations,
        readIds: result.coverage.topics.map((topic) => topic.c),
        caseFile: result,
        updatedAt: new Date().toISOString(),
      }).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The read stopped');
      setStep('setup');
    }
  };

  const download = () => {
    if (!caseFile) return;
    const blob = new Blob([JSON.stringify(caseFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.replace(/\.\w+$/, '') || 'chat-insights'}-case-file.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!caseFile) return;
    if (!user) {
      toast.message('Sign in to save the case file. The key stays on this device.');
      navigate('/auth');
      return;
    }
    try {
      const fingerprint = await exportFingerprint(conversations);
      await saveCaseFile(user.id, fingerprint, filename, caseFile);
      setSaveMessage(caseFile.coverage.partial
        ? 'Saved as a partial report. Running it again updates this same row.'
        : 'Saved. Running the same export again updates this row instead of adding another.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save. If the case file table is not migrated yet, download the JSON.');
    }
  };

  return (
    <div>
      {step === 'drop' && (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-display text-4xl sm:text-5xl">Drop the export</h1>
          <p className="mt-3 text-muted-foreground">Parsed in the browser. The file is not uploaded.</p>
          <div className="mt-8">
            <ExportDropzone
              isDragActive={dropzone.isDragActive}
              stage={stage}
              rootProps={dropzone.getRootProps()}
              inputProps={dropzone.getInputProps()}
            />
          </div>
          <div className="mt-10 space-y-4">
            {EXPORT_GUIDES.map((guide) => (
              <article key={guide.name} className="rounded-2xl border border-white/10 p-4">
                <h2 className="font-medium">{guide.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{guide.steps}</p>
                <p className="mt-2 text-sm">We need: {guide.need}</p>
                <a className="mt-2 inline-block text-sm text-primary underline" href={guide.href} target="_blank" rel="noreferrer">Official export page</a>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm">
            <Link to="/read?sample=1" className="text-primary underline">Or walk through a fake sample</Link>
          </p>
        </div>
      )}

      {step === 'preview' && local && (
        <div className="mx-auto max-w-3xl px-4 py-10" data-testid="preview">
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{filename}</p>
          <h1 className="mt-2 font-display text-4xl">Local preview</h1>
          <p className="mt-3 text-muted-foreground">No key and no model call. This is what the file contains before you spend anything.</p>
          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Stat label="Conversations" value={String(local.totals.conversations)} />
            <Stat label="Flagged" value={String(local.totals.flagged)} />
            <Stat label="Your tokens" value={String(local.totals.userTokens)} />
            <Stat label="Emails" value={String(local.exposure.emails.length)} />
            <Stat label="Phones" value={String(local.exposure.phones.length)} />
            <Stat label="Card-like" value={String(local.exposure.cardLike)} />
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            About {local.style.wordsPerMessage} words per message you sent. Question share {Math.round(local.style.questionShare * 100)}%.
          </p>
          <div className="mt-8 flex gap-3">
            <button type="button" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground" onClick={() => setStep('setup')}>
              Choose a model
            </button>
            <button type="button" className="rounded-full border border-white/15 px-5 py-2 text-sm" onClick={() => { setStep('drop'); clearCheckpoint().catch(() => undefined); }}>
              Start over
            </button>
          </div>
        </div>
      )}

      {step === 'setup' && local && selection && (
        <SetupPanel
          values={setup}
          onChange={patchSetup}
          estimate={estimate}
          selected={selection.chosenIds.length}
          total={local.totals.conversations}
          flagged={local.totals.flagged}
          preset={preset}
          savedKeys={savedKeys}
          testMessage={testMessage}
          onTest={() => { testKey().catch(() => undefined); }}
          onRemember={() => { remember().catch(() => undefined); }}
          onForget={(id) => { forgetKey(idbVaultStore(), id).then(refreshKeys).catch(() => undefined); }}
          onForgetAll={() => { forgetAllKeys(idbVaultStore()).then(refreshKeys).catch(() => undefined); }}
          onUseSaved={(id) => { loadSaved(id).catch(() => undefined); }}
          onRun={() => { start().catch(() => undefined); }}
          busy={false}
        />
      )}

      {step === 'run' && !progress && <p className="px-4 py-16 text-sm text-muted-foreground">Starting the read…</p>}
      {step === 'run' && progress && (
        <ProgressView
          progress={progress}
          paused={paused}
          onPause={() => { pausedRef.current = true; setPaused(true); }}
          onResume={() => { pausedRef.current = false; setPaused(false); }}
        />
      )}

      {step === 'report' && caseFile && (
        <ReportView
          caseFile={caseFile}
          conversations={conversations}
          onDownload={download}
          onSave={() => { save().catch(() => undefined); }}
          saveMessage={saveMessage}
        />
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="font-display text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export default ReadPage;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { archiveExportFile, metadataFromParse } from '../lib/archive/client';
import { ArchiveUploadError, archiveSkipNotice, uploadFailureMessage } from '../lib/archive/failure';
import { isSampleRead } from '../lib/archive/policy';
import { parseConversationExport, validateUploadFile } from '../lib/conversationParser';
import type { NormalizedConversation } from '../lib/conversationParser/types';
import { createAdapter } from '../lib/insights/adapters';
import { checkpointAfterRetry, clearCheckpoint, idbVaultStore, loadCheckpoint, saveCheckpoint, subscribeLocalReadCleared } from '../lib/insights/browserStore';
import { ARCHIVE_ACK, ARCHIVE_NOTICE, EXPORT_GUIDES } from '../lib/insights/copy';
import { selectConversations } from '../lib/insights/depth';
import { estimateRead, formatCost } from '../lib/insights/estimate';
import { maySaveAccountKey, rejectedKeyBlock, shouldSaveLocalRun, PROVIDER_AUTH_MESSAGE, type KeyTestSnapshot } from '../lib/insights/keyGate';
import { canShowCheckpoint } from '../lib/insights/localRead';
import { packBatches } from '../lib/insights/pack';
import { ProviderRequestError } from '../lib/insights/transport';
import { isExpiredSession, requestSessionExpiry, SESSION_EXPIRED_EVENT, SESSION_EXPIRED_MESSAGE } from '../lib/authSession';
import { forgetAllKeys, forgetKey, listKeys, rememberKey, revealKey, type KeySummary } from '../lib/insights/keyVault';
import { runLocalPass, type LocalReport } from '../lib/insights/localPass';
import { caseDownloadName } from '../lib/insights/hydratePremium';
import { caseDiff, conversationDelta, matchSavedCase, stampsFrom, stampsFromCase, stripChangedFacts } from '../lib/insights/livingCase';
import { mergeCaseFiles, type CaseFile } from '../lib/insights/merge';
import { combineExports, COMBINABLE_PROVIDERS, providerPortraits } from '../lib/insights/providerPortrait';
import { parseExtraAllowlist } from '../lib/insights/proxyPolicy';
import { catalogModel, defaultModel, providerPreset } from '../lib/insights/prices';
import type { RunProgress } from '../lib/insights/runner';
import { budgetBlocks, budgetFromFields, retryNarrative, runRead } from '../lib/insights/runner';
import { EMPTY_READ_NOTICES, noticesAfter } from '../lib/insights/readSession';
import { buildSampleConversations, createDemoAdapter } from '../lib/insights/sample';
import { exportFingerprint } from '../lib/insights/saveReport';
import { loadAccountProviderKey, ProviderKeyError, saveAccountProviderKey } from '../lib/providerKeys/client';
import { supabase } from '../lib/supabase';
import { getCaseFile, listCaseFiles, saveCaseFile, type SavedCaseSummary } from '../services/caseFileService';
import LocalReportPanel from '../components/insights/LocalReportPanel';
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
  saveToAccount: false,
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [interrupted, setInterrupted] = useState(false);
  const [step, setStep] = useState<'drop' | 'preview' | 'setup' | 'run' | 'report'>('drop');
  const [stage, setStage] = useState<UploadStage>('idle');
  const [filename, setFilename] = useState('');
  const [conversations, setConversations] = useState<NormalizedConversation[]>([]);
  const [local, setLocal] = useState<LocalReport | null>(null);
  const [setup, setSetup] = useState<SetupValues>(DEFAULT_SETUP);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const [savedKeys, setSavedKeys] = useState<KeySummary[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [paused, setPaused] = useState(false);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [retryNote, setRetryNote] = useState('');
  const [resumeIds, setResumeIds] = useState<string[]>([]);
  const pausedRef = useRef(false);
  const sampleLoaded = useRef(false);
  const accountSecrets = useRef<Record<string, { secret: string; hint: string }>>({});
  const [accountHint, setAccountHint] = useState<string | null>(null);
  const [archiveAcknowledged, setArchiveAcknowledged] = useState(false);
  const [archiveSkip, setArchiveSkip] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [testedKey, setTestedKey] = useState<KeyTestSnapshot | null>(null);
  const [runError, setRunError] = useState('');
  const [fileFingerprint, setFileFingerprint] = useState('');
  const [savedRows, setSavedRows] = useState<SavedCaseSummary[]>([]);
  const [addError, setAddError] = useState('');
  const [loadedUpdate, setLoadedUpdate] = useState<{ file: CaseFile; fingerprint: string; filename: string } | null>(null);
  const [updateOffer, setUpdateOffer] = useState<null | {
    base: CaseFile;
    originFingerprint: string;
    filename: string;
    added: string[];
    changed: string[];
    unchanged: string[];
    dropped: string[];
    unchangedRead: string[];
  }>(null);
  const retryFile = useRef<File | null>(null);
  const pendingFile = useRef<File | null>(null);
  const ackRef = useRef(false);
  const readEpoch = useRef(0);
  const caseRef = useRef<{ file: CaseFile; filename: string } | null>(null);
  if (caseFile) caseRef.current = { file: caseFile, filename };

  const resetRead = useCallback(() => {
    readEpoch.current += 1;
    setStep('drop');
    setStage('idle');
    setFilename('');
    setConversations([]);
    setLocal(null);
    setCaseFile(null);
    setResumeIds([]);
    setProgress(null);
    setPaused(false);
    pausedRef.current = false;
    const cleared = noticesAfter('start-over', EMPTY_READ_NOTICES);
    setRetryNote(cleared.retryNote);
    setSaveMessage(cleared.saveMessage);
    setTestMessage('');
    setTestedKey(null);
    setRunError(cleared.runError);
    setUploadError(null);
    setSetup(DEFAULT_SETUP);
    accountSecrets.current = {};
    setAccountHint(null);
  }, []);

  const refreshKeys = useCallback(async () => {
    try {
      setSavedKeys(await listKeys(idbVaultStore()));
    } catch {
      setSavedKeys([]);
    }
  }, []);

  useEffect(() => subscribeLocalReadCleared(resetRead), [resetRead]);

  useEffect(() => {
    refreshKeys().catch(() => undefined);
    if (authLoading) return;
    const epoch = readEpoch.current;
    const userId = user?.id ?? null;
    let cancelled = false;
    loadCheckpoint().then(async (checkpoint) => {
      if (cancelled || epoch !== readEpoch.current || !checkpoint || sampleLoaded.current) return;
      if (!canShowCheckpoint(checkpoint, userId)) {
        await clearCheckpoint().catch(() => undefined);
        return;
      }
      if (userId && checkpoint.ownerId == null) {
        await saveCheckpoint({ ...checkpoint, ownerId: userId }).catch(() => undefined);
      }
      if (cancelled || epoch !== readEpoch.current) return;
      setConversations(checkpoint.conversations);
      setFilename(checkpoint.filename);
      setLocal(runLocalPass(checkpoint.conversations));
      setResumeIds(checkpoint.readIds);
      setSetup((current) => {
        const next = applyProvider(checkpoint.provider, current);
        return {
          ...next,
          depth: checkpoint.depth,
          modelId: checkpoint.model || next.modelId,
          quickFraction: checkpoint.quickFraction ?? current.quickFraction,
        };
      });
      if (checkpoint.caseFile) {
        setCaseFile(checkpoint.caseFile);
        if (!new URLSearchParams(window.location.search).get('update')) setStep('report');
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authLoading, refreshKeys, user?.id]);

  useEffect(() => {
    if (!user) return;
    listCaseFiles(user.id).then(setSavedRows).catch(() => undefined);
    const updateId = searchParams.get('update');
    if (!updateId) return;
    getCaseFile(user.id, updateId).then((row) => {
      if (!row?.case_file) return;
      setLoadedUpdate({ file: row.case_file, fingerprint: row.export_fingerprint ?? '', filename: row.filename ?? 'Export' });
      setCaseFile(row.case_file);
      setFilename(row.filename ?? 'Export');
    }).catch(() => undefined);
  }, [user, searchParams]);

  useEffect(() => {
    if (!user) {
      accountSecrets.current = {};
      setAccountHint(null);
      return;
    }
    const provider = setup.providerId;
    let cancelled = false;
    setAccountHint(accountSecrets.current[provider]?.hint ?? null);
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token;
      if (!accessToken || cancelled) return;
      try {
        const saved = await loadAccountProviderKey({
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          accessToken,
          provider,
        });
        if (cancelled) return;
        if (!saved) {
          delete accountSecrets.current[provider];
          setAccountHint(null);
          return;
        }
        accountSecrets.current[provider] = saved;
        setAccountHint(saved.hint);
        setSetup((current) => current.providerId === provider ? { ...current, saveToAccount: true } : current);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ProviderKeyError && isExpiredSession({ status: error.status, message: error.message })) {
          setSessionNote(SESSION_EXPIRED_MESSAGE);
          requestSessionExpiry();
        }
        delete accountSecrets.current[provider];
        setAccountHint(null);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, setup.providerId]);

  useEffect(() => {
    const onExpired = () => {
      setSessionNote(SESSION_EXPIRED_MESSAGE);
      setAccountHint(null);
      accountSecrets.current = {};
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('ci-read-in-progress') === '1') {
      sessionStorage.removeItem('ci-read-in-progress');
      setInterrupted(true);
    }
  }, []);

  useEffect(() => {
    if (step === 'run') {
      sessionStorage.setItem('ci-read-in-progress', '1');
      const warn = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
    }
    sessionStorage.removeItem('ci-read-in-progress');
    return undefined;
  }, [step]);

  useEffect(() => {
    if (searchParams.get('sample') !== '1' || sampleLoaded.current) return;
    sampleLoaded.current = true;
    const sample = buildSampleConversations();
    const localReport = runLocalPass(sample);
    const sampleEstimate = estimateRead({
      depth: 'standard',
      conversationCount: localReport.totals.conversations,
      userTokens: localReport.totals.userTokens,
      fullTokens: localReport.totals.fullTokens,
      contextWindow: 100_000,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
    });
    setConversations(sample);
    setFilename('sample-not-a-real-person.json');
    setLocal(localReport);
    setSetup((current) => applyProvider('demo', current));
    const sampleNotes = noticesAfter('new-read', EMPTY_READ_NOTICES);
    setRetryNote(sampleNotes.retryNote);
    setRunError(sampleNotes.runError);
    setSaveMessage(sampleNotes.saveMessage);
    setStep('run');
    runRead({
      conversations: sample,
      local: localReport,
      depth: 'standard',
      model: {
        provider: 'demo',
        id: 'demo-extractor',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        contextWindow: 100_000,
      },
      adapter: createDemoAdapter({ latencyMs: 0 }),
      estimate: { tokens: sampleEstimate.inputTokens + sampleEstimate.outputTokens, dollars: sampleEstimate.cost },
      sleep: async () => undefined,
    }).then((result) => {
      setCaseFile(result);
      setStep('report');
    }).catch(() => {
      toast.error('The sample did not open.');
      setStep('preview');
    });
  }, [searchParams]);

  const resolveSecret = () => setup.apiKey.trim() || accountSecrets.current[setup.providerId]?.secret || '';

  const onDrop = useCallback(async (files: File[]) => {
    if (isSampleRead(window.location.search)) return;
    const file = files[0];
    if (!file) return;
    const invalid = validateUploadFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    retryFile.current = file;
    setInterrupted(false);
    if (!ackRef.current) {
      pendingFile.current = file;
      setUploadError('Confirm the storage notice to open this file. It stays selected.');
      return;
    }
    setUploadError(null);
    setArchiveSkip(null);
    setStage('storing');
    let archived = false;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsePromise = parseConversationExport(file.name, bytes);
      try {
        const { data } = await supabase.auth.getSession();
        await archiveExportFile({
          filename: file.name,
          bytes,
          contentType: file.type,
          metadata: parsePromise.then(metadataFromParse),
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          accessToken: data.session?.access_token ?? null,
        });
        archived = true;
      } catch (error) {
        if (error instanceof ArchiveUploadError && isExpiredSession({ status: error.status, message: error.message })) {
          setSessionNote(SESSION_EXPIRED_MESSAGE);
          requestSessionExpiry();
        }
        setArchiveSkip(archiveSkipNotice(error));
      }
      setStage('parsing');
      const parsed = await parsePromise;
      setStage('counting');
      setConversations(parsed.conversations);
      setFileFingerprint(await exportFingerprint(parsed.conversations));
      setFilename(file.name);
      setSetup((current) => ({ ...current, maxDollars: '', maxTokens: '' }));
      setLocal(runLocalPass(parsed.conversations));
      if (caseRef.current) {
        const remembered = caseRef.current;
        setLoadedUpdate((existing) => existing ?? {
          file: remembered.file,
          fingerprint: remembered.file.lineage?.originFingerprint || '',
          filename: remembered.filename,
        });
      }
      setCaseFile(null);
      setResumeIds([]);
      setUploadError(null);
      const cleared = noticesAfter('new-file', EMPTY_READ_NOTICES);
      setRetryNote(cleared.retryNote);
      setRunError(cleared.runError);
      setSaveMessage(cleared.saveMessage);
      setProgress(null);
      setStep('preview');
      parsed.warnings.forEach((warning) => toast.message(warning));
    } catch (error) {
      setUploadError(uploadFailureMessage(error, archived));
    } finally {
      setStage('idle');
    }
  }, []);

  useEffect(() => {
    ackRef.current = archiveAcknowledged;
    if (!archiveAcknowledged || !pendingFile.current || stage !== 'idle') return;
    const file = pendingFile.current;
    pendingFile.current = null;
    void onDrop([file]);
  }, [archiveAcknowledged, onDrop, stage]);

  const busy = stage !== 'idle';
  const dropzone = useDropzone({
    onDrop: (files) => {
      void onDrop(files);
    },
    useFsAccessApi: false,
    multiple: false,
    disabled: busy,
    noClick: busy,
    noDrag: busy,
    noKeyboard: busy,
  });

  const patchSetup = (patch: Partial<SetupValues>) => {
    if (patch.apiKey !== undefined || patch.providerId) {
      setRunError('');
      setTestMessage('');
      if (patch.apiKey !== undefined) setTestedKey(null);
    }
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

  useEffect(() => {
    if (step !== 'preview' || !fileFingerprint || !conversations.length) return;
    const incoming = stampsFrom(conversations);
    const candidates = [
      ...(loadedUpdate ? [loadedUpdate] : []),
      ...(caseFile ? [{ file: caseFile, fingerprint: caseFile.lineage?.originFingerprint || '', filename }] : []),
      ...savedRows.flatMap((row) => (row.case_file ? [{ file: row.case_file, fingerprint: row.export_fingerprint ?? row.case_file.lineage?.originFingerprint ?? '', filename: row.filename ?? 'Export' }] : [])),
    ];
    const hit = candidates.find((candidate) => matchSavedCase(incoming, fileFingerprint, candidate));
    if (!hit) {
      setUpdateOffer(null);
      return;
    }
    const delta = conversationDelta(stampsFromCase(hit.file), conversations);
    const readBefore = new Set(hit.file.coverage.topics.map((topic) => topic.c));
    setUpdateOffer({
      base: hit.file,
      originFingerprint: hit.file.lineage?.originFingerprint || hit.fingerprint || fileFingerprint,
      filename: hit.filename,
      ...delta,
      unchangedRead: delta.unchanged.filter((id) => readBefore.has(id)),
    });
  }, [step, fileFingerprint, conversations, caseFile, filename, savedRows, loadedUpdate]);

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
  const contextWindow = priced?.context ?? (preset.local ? 8192 : 128_000);
  const updatePending = useMemo(() => {
    if (!updateOffer || !local) return null;
    const ids = new Set([...updateOffer.added, ...updateOffer.changed]);
    return local.conversations.filter((conversation) => ids.has(conversation.id));
  }, [updateOffer, local]);
  const plannedBatches = useMemo(() => {
    if (!selection && !updatePending) return undefined;
    const byId = new Map(conversations.map((conversation) => [conversation.id, conversation]));
    const resumed = new Set(updateOffer ? updateOffer.unchangedRead : resumeIds);
    const sourceIds = updatePending
      ? updatePending.map((conversation) => conversation.id)
      : (selection?.chosenIds ?? []).filter((id) => !resumed.has(id));
    const ordered = sourceIds
      .map((id) => byId.get(id))
      .filter((conversation): conversation is NormalizedConversation => Boolean(conversation));
    return packBatches(ordered, setup.depth, contextWindow);
  }, [selection, conversations, resumeIds, setup.depth, contextWindow, updateOffer, updatePending]);
  const estimate = estimateRead({
    depth: setup.depth,
    conversationCount: updatePending ? updatePending.length : chosen.length,
    userTokens: (updatePending ?? chosen).reduce((sum, item) => sum + item.userTokens, 0),
    fullTokens: (updatePending ?? chosen).reduce((sum, item) => sum + item.fullTokens, 0),
    contextWindow,
    inputPricePerMillion: Number(setup.inputPrice) || 0,
    outputPricePerMillion: Number(setup.outputPrice) || 0,
    pacing: 'slow',
    plannedBatches: plannedBatches?.map((batch) => ({ tokens: batch.tokens, userTokens: batch.userTokens })),
  });
  const keyBlock = rejectedKeyBlock(testedKey, setup.providerId, resolveSecret());

  const remember = async () => {
    try {
      await rememberKey(idbVaultStore(), {
        provider: setup.providerId,
        label: preset.label,
        secret: resolveSecret(),
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
        apiKey: resolveSecret(),
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
      const result = await adapter.testConnection!();
      setTestedKey({ providerId: setup.providerId, secret: resolveSecret(), ok: result.ok, message: result.message });
      setTestMessage(result.message);
      if (result.ok) setRunError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The test call failed';
      setTestedKey({ providerId: setup.providerId, secret: resolveSecret(), ok: false, message });
      setTestMessage(message);
    }
  };

  const saveAccountKey = async (secret = setup.apiKey.trim()) => {
    if (!user) throw new Error('Sign in to save a key to your account.');
    if (!secret) {
      throw new Error('Type the key to save it to your account.');
    }
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Sign in to save a key to your account.');
    const saved = await saveAccountProviderKey({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      accessToken,
      provider: setup.providerId,
      secret,
    });
    accountSecrets.current[setup.providerId] = saved;
    setAccountHint(saved.hint);
    setSetup((current) => ({ ...current, apiKey: '', saveToAccount: true }));
    setTestedKey({ providerId: setup.providerId, secret, ok: true, message: 'Key works.' });
    toast.success('Key saved to your account');
  };

  const confirmAccountKey = async () => {
    const secret = setup.apiKey.trim();
    if (!secret) {
      toast.error('Type the key to save it to your account.');
      return;
    }
    setTestMessage('Testing…');
    try {
      const adapter = createAdapter(setup.providerId, {
        apiKey: secret,
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
      const result = await adapter.testConnection!();
      setTestedKey({ providerId: setup.providerId, secret, ok: result.ok, message: result.message });
      setTestMessage(result.message);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await saveAccountKey(secret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The key could not be saved to your account.';
      setTestMessage(message);
      toast.error(message);
    }
  };

  const start = async () => {
    if (!local) return;
    const block = rejectedKeyBlock(testedKey, setup.providerId, resolveSecret());
    if (block) {
      setRunError(block);
      toast.error(block);
      return;
    }
    const typedSecret = setup.apiKey.trim();
    const testedOk = Boolean(testedKey?.ok && testedKey.providerId === setup.providerId && testedKey.secret === resolveSecret());
    if (maySaveAccountKey({ optedIn: setup.saveToAccount, typedSecret, testedOk, runSucceeded: false })) {
      try {
        await saveAccountKey();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'The key could not be saved to your account, so the read did not start.');
        return;
      }
    }
    const secret = resolveSecret();
    setStep('run');
    setPaused(false);
    pausedRef.current = false;
    const cleared = noticesAfter('new-read', EMPTY_READ_NOTICES);
    setRetryNote(cleared.retryNote);
    setSaveMessage(cleared.saveMessage);
    setRunError(cleared.runError);
    const adapter = setup.providerId === 'demo'
      ? createDemoAdapter({ latencyMs: 900 })
      : createAdapter(setup.providerId, {
        apiKey: secret,
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
        alreadyReadIds: updateOffer ? updateOffer.unchangedRead : resumeIds,
        selectedIds: updateOffer ? [...updateOffer.unchangedRead, ...updateOffer.added, ...updateOffer.changed] : undefined,
        estimate: { tokens: estimate.inputTokens + estimate.outputTokens, dollars: estimate.cost },
        isPaused: () => pausedRef.current,
        onProgress: setProgress,
      });
      if (!shouldSaveLocalRun(result.coverage)) {
        setCaseFile(null);
        setProgress(null);
        setRunError(PROVIDER_AUTH_MESSAGE);
        toast.error(PROVIDER_AUTH_MESSAGE);
        setStep('setup');
        return;
      }
      if (!testedOk && maySaveAccountKey({ optedIn: setup.saveToAccount, typedSecret, testedOk: false, runSucceeded: true })) {
        try {
          await saveAccountKey(typedSecret);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'The read finished, but the key could not be saved to your account.');
        }
      }
      const fingerprint = fileFingerprint || await exportFingerprint(conversations);
      const origin = updateOffer?.originFingerprint || fingerprint;
      let next: CaseFile = {
        ...result,
        providers: local ? providerPortraits(local, result.coverage.topics) : result.providers,
        lineage: { originFingerprint: origin, fingerprint, stamps: stampsFrom(conversations) },
      };
      if (updateOffer) {
        const merged = mergeCaseFiles(stripChangedFacts(updateOffer.base, updateOffer.changed), next);
        next = {
          ...merged,
          providers: next.providers,
          lineage: next.lineage,
          changes: caseDiff(updateOffer.base, merged, updateOffer),
        };
      }
      setCaseFile(next);
      setStep('report');
      await persistRead(next);
    } catch (error) {
      const message = error instanceof ProviderRequestError && error.kind === 'auth'
        ? PROVIDER_AUTH_MESSAGE
        : error instanceof Error ? error.message : 'The read stopped';
      setCaseFile(null);
      setProgress(null);
      setRunError(message);
      toast.error(message);
      setStep('setup');
    }
  };

  const persistRead = async (file: CaseFile) => {
    const fingerprint = await exportFingerprint(conversations);
    const stored = await loadCheckpoint().catch(() => null);
    await saveCheckpoint(checkpointAfterRetry({
      fingerprint,
      filename,
      depth: file.model.depth,
      provider: file.model.provider,
      model: file.model.id,
      conversations,
      readIds: file.coverage.topics.map((topic) => topic.c),
      caseFile: file,
      updatedAt: new Date().toISOString(),
      ownerId: user?.id ?? stored?.ownerId ?? null,
      selectedIds: file.coverage.selectedIds ?? stored?.selectedIds,
      quickFraction: setup.quickFraction,
    }, file)).catch(() => undefined);
  };

  const download = () => {
    if (!caseFile) return;
    const blob = new Blob([JSON.stringify(caseFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = caseDownloadName(filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!caseFile) return;
    if (!user) {
      toast.message('Sign in to save the case file. The key stays on this device.');
      navigate('/auth');
      throw new Error('Sign in to save the case file.');
    }
    try {
      const fingerprint = caseFile.lineage?.originFingerprint || await exportFingerprint(conversations);
      await saveCaseFile(user.id, fingerprint, filename, caseFile);
      const saved = caseFile.coverage.partial
        ? 'Saved as a partial report. Running it again updates this same row.'
        : 'Saved. Running the same export again updates this row instead of adding another.';
      setSaveMessage(saved);
      toast.success(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save. If the case file table is not migrated yet, download the JSON.';
      setSaveMessage(message);
      throw new Error(message);
    }
  };

  const retryBudget = () => budgetFromFields(setupRef.current.maxTokens, setupRef.current.maxDollars);

  const clearCaps = () => {
    const next = { ...setupRef.current, maxTokens: '', maxDollars: '' };
    setupRef.current = next;
    setSetup(next);
  };

  const retryUnread = async () => {
    if (!caseFile || !local) return;
    const previous = caseFile;
    const budget = retryBudget();
    if (budgetBlocks(budget, estimate.cost, estimate.inputTokens + estimate.outputTokens)) {
      const cap = [
        budget.maxTokens != null ? `token cap ${budget.maxTokens.toLocaleString()}` : '',
        budget.maxDollars != null ? `dollar cap $${budget.maxDollars}` : '',
      ].filter(Boolean).join(' and ');
      setRetryNote(`No call went out. The ${cap || 'budget cap'} is below this estimate. Clear it and try again.`);
      return;
    }
    const readIds = previous.coverage.topics.map((topic) => topic.c);
    setStep('run');
    setPaused(false);
    pausedRef.current = false;
    setSaveMessage('');
    setRunError('');
    setRetryNote('');
    const secret = resolveSecret();
    const adapter = setup.providerId === 'demo'
      ? createDemoAdapter({ latencyMs: 900 })
      : createAdapter(setup.providerId, {
        apiKey: secret,
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
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
        adapter,
        alreadyReadIds: readIds,
        selectedIds: previous.coverage.selectedIds,
        estimate: { tokens: estimate.inputTokens + estimate.outputTokens, dollars: estimate.cost },
        isPaused: () => pausedRef.current,
        budget,
        onProgress: setProgress,
      });
      const merged = mergeCaseFiles(previous, result);
      setCaseFile(merged);
      await persistRead(merged);
      const calls = result.coverage.batches;
      setRetryNote(merged.coverage.partial && calls === 0
        ? 'No call went out. The read stopped before the provider was asked.'
        : '');
      setStep('report');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The unread conversations could not be read.';
      setCaseFile(previous);
      setProgress(null);
      setRunError(message);
      setRetryNote(message);
      toast.error(message);
      setStep('report');
    }
  };

  const retryWriteUp = async () => {
    if (!caseFile || !local) return;
    setStep('run');
    setPaused(false);
    pausedRef.current = false;
    setRetryNote('');
    setRunError('');
    if (caseFile.coverage.narrative === 'skipped-budget') clearCaps();
    const secret = resolveSecret();
    const adapter = setup.providerId === 'demo'
      ? createDemoAdapter({ latencyMs: 900 })
      : createAdapter(setup.providerId, {
        apiKey: secret,
        model: setup.modelId,
        baseUrl: setup.baseUrl || preset.baseUrl,
        extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
      });
    try {
      const next = await retryNarrative({
        file: caseFile,
        adapter,
        prices: { input: Number(setup.inputPrice) || 0, output: Number(setup.outputPrice) || 0 },
        onProgress: setProgress,
      });
      setCaseFile(next);
      await persistRead(next);
      setRetryNote('');
      setStep('report');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The write-up could not be tried again.';
      setProgress(null);
      setRetryNote(message);
      toast.error(message);
      setStep('report');
    }
  };

  const continueAfterCap = async () => {
    clearCaps();
    await retryUnread();
  };

  return (
    <div>
      {step === 'drop' && (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-display text-4xl sm:text-5xl">Drop the export</h1>
          <p className="mt-3 text-muted-foreground">Parsing runs in your browser. The notice below is the storage step.</p>
          {interrupted && (
            <p className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" data-testid="read-interrupted">
              The last read was interrupted before it finished. Start again when you are ready. A closed tab does not keep a half-finished read.
            </p>
          )}
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm" data-testid="archive-notice">
            <p>{ARCHIVE_NOTICE}</p>
            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={archiveAcknowledged}
                onChange={(event) => setArchiveAcknowledged(event.target.checked)}
                data-testid="archive-ack"
              />
              <span>{ARCHIVE_ACK}</span>
            </label>
          </div>
          <div className="mt-8">
            <ExportDropzone
              isDragActive={dropzone.isDragActive}
              stage={stage}
              locked={busy}
              error={uploadError}
              onRetry={retryFile.current ? () => { void onDrop([retryFile.current as File]); } : null}
              rootProps={dropzone.getRootProps()}
              inputProps={dropzone.getInputProps()}
            />
          </div>
          <p className="mt-8 text-sm text-muted-foreground">{COMBINABLE_PROVIDERS.join(', ')} can be combined into one case file. A file the parser does not recognize is refused with a reason.</p>
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
            <span className="text-muted-foreground"> The sample is not uploaded.</span>
          </p>
        </div>
      )}

      {step === 'preview' && local && (
        <div className="mx-auto max-w-3xl px-4 py-10" data-testid="preview">
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{filename}</p>
          <h1 className="mt-2 font-display text-4xl">Local preview</h1>
          <p className="mt-3 text-muted-foreground">No key and no model call. This is what the file contains before you spend anything.</p>
          <LocalReportPanel report={local} />
          <p className="mt-6 text-sm text-muted-foreground">ChatGPT, Claude, Gemini, and Grok exports can be combined. Other files are refused with the parser’s reason, not treated as a chat.</p>
          {local.usage.providers.length > 1 && (
            <ul className="mt-3 space-y-1 text-sm" data-testid="source-mix">
              {local.usage.providers.map((row) => (
                <li key={row.name}>{row.name}: {row.count}</li>
              ))}
            </ul>
          )}
          <label className="mt-4 inline-block text-sm text-primary underline">
            Add another export
            <input
              className="sr-only"
              type="file"
              data-testid="add-export"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void (async () => {
                  setAddError('');
                  try {
                    const bytes = new Uint8Array(await file.arrayBuffer());
                    const parsed = await parseConversationExport(file.name, bytes);
                    const combined = combineExports([conversations, parsed.conversations]);
                    setConversations(combined);
                    setLocal(runLocalPass(combined));
                    setFileFingerprint(await exportFingerprint(combined));
                    setFilename((current) => current.includes(file.name) ? current : `${current} + ${file.name}`);
                  } catch (error) {
                    setAddError(error instanceof Error ? error.message : `${file.name} is not a supported export.`);
                  }
                })();
              }}
            />
          </label>
          {addError && <p className="mt-3 text-sm text-amber-100" data-testid="add-export-error">{addError}</p>}
          {updateOffer && (
            <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm" data-testid="update-offer">
              <p>This matches {updateOffer.filename}. {updateOffer.added.length} new, {updateOffer.changed.length} changed, {updateOffer.unchanged.length} unchanged, {updateOffer.dropped.length} dropped.</p>
              <p className="mt-2">This update sends only the new and changed chats: about {formatCost(estimate.cost)} and {(estimate.inputTokens + estimate.outputTokens).toLocaleString()} tokens.</p>
              <button
                type="button"
                className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => {
                  setResumeIds(updateOffer.unchangedRead);
                  setStep('setup');
                }}
              >
                Update this case file
              </button>
            </div>
          )}
          {archiveSkip && (
            <p className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" data-testid="archive-skip">{archiveSkip}</p>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            About {local.style.wordsPerMessage} words per message you sent. Question share {Math.round(local.style.questionShare * 100)}%.
          </p>
          <div className="mt-8 flex gap-3">
            <button type="button" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground" onClick={() => setStep('setup')}>
              Choose a model
            </button>
            <button type="button" className="rounded-full border border-white/15 px-5 py-2 text-sm" onClick={() => {
              const cleared = noticesAfter('start-over', EMPTY_READ_NOTICES);
              setRetryNote(cleared.retryNote);
              setRunError(cleared.runError);
              setSaveMessage(cleared.saveMessage);
              setProgress(null);
              setSetup((current) => ({ ...current, maxDollars: '', maxTokens: '' }));
              setStep('drop');
              clearCheckpoint().catch(() => undefined);
            }}>
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
          signedIn={Boolean(user)}
          accountHint={accountHint}
          onSaveAccountKey={() => { confirmAccountKey().catch(() => undefined); }}
          startBlockedMessage={keyBlock}
          runError={runError}
          sessionNote={sessionNote}
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
          onSave={new URLSearchParams(window.location.search).get('sample') === '1' ? undefined : () => save()}
          onRetryUnread={new URLSearchParams(window.location.search).get('sample') === '1' ? undefined : () => { retryUnread().catch(() => undefined); }}
          onContinue={new URLSearchParams(window.location.search).get('sample') === '1' ? undefined : () => { continueAfterCap().catch(() => undefined); }}
          onRetryWriteUp={new URLSearchParams(window.location.search).get('sample') === '1' ? undefined : () => { retryWriteUp().catch(() => undefined); }}
          retryNote={retryNote}
          ask={{
            prices: { input: Number(setup.inputPrice) || catalogModel(setup.providerId, setup.modelId)?.input || 0, output: Number(setup.outputPrice) || catalogModel(setup.providerId, setup.modelId)?.output || 0 },
            budget: retryBudget(),
            complete: (resolveSecret() || setup.providerId === 'demo') ? (request) => {
              const secret = resolveSecret();
              const adapter = setup.providerId === 'demo'
                ? createDemoAdapter({ latencyMs: 0 })
                : createAdapter(setup.providerId, {
                  apiKey: secret,
                  model: setup.modelId,
                  baseUrl: setup.baseUrl || preset.baseUrl,
                  extraAllowlist: parseExtraAllowlist(import.meta.env.VITE_PROXY_ALLOWLIST),
                });
              return adapter.complete(request);
            } : undefined,
          }}
          onCaseFile={(next) => {
            setCaseFile(next);
            persistRead(next).catch(() => undefined);
          }}
          demo={new URLSearchParams(window.location.search).get('sample') === '1'}
          onClose={() => {
            if (new URLSearchParams(window.location.search).get('sample') === '1') navigate('/');
            else setStep('preview');
          }}
          saveMessage={saveMessage}
        />
      )}
    </div>
  );
};

export default ReadPage;

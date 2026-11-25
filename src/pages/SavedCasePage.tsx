import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReportView from '../components/insights/ReportView';
import { parseConversationExport } from '../lib/conversationParser';
import type { NormalizedConversation } from '../lib/conversationParser/types';
import { createAdapter, type CompleteRequest, type CompleteResult } from '../lib/insights/adapters';
import { idbVaultStore, loadCheckpoint } from '../lib/insights/browserStore';
import { caseDownloadName } from '../lib/insights/hydratePremium';
import { listKeys, revealKey } from '../lib/insights/keyVault';
import type { CaseFile } from '../lib/insights/merge';
import { catalogModel, providerPreset } from '../lib/insights/prices';
import { ATTACH_MISMATCH, attachResult } from '../lib/insights/receipts';
import { exportFingerprint } from '../lib/insights/saveReport';
import { getCaseFile, saveCaseFile } from '../services/caseFileService';

const SavedCasePage: React.FC = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<{ filename: string | null; export_fingerprint: string | null; case_file: CaseFile } | null>(null);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState<NormalizedConversation[]>([]);
  const [attachError, setAttachError] = useState('');
  const [askComplete, setAskComplete] = useState<((request: CompleteRequest) => Promise<CompleteResult>) | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!id) return;
    getCaseFile(user.id, id)
      .then((row) => {
        if (!row) setError('That report is not on this account.');
        else setFile(row);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the report'));
  }, [user, authLoading, id, navigate]);

  useEffect(() => {
    const expected = file?.export_fingerprint;
    if (!expected) return;
    loadCheckpoint().then((checkpoint) => {
      if (checkpoint?.fingerprint === expected && checkpoint.conversations.length) {
        setConversations(checkpoint.conversations);
      }
    }).catch(() => undefined);
  }, [file?.export_fingerprint]);

  useEffect(() => {
    const provider = file?.case_file.model.provider;
    const model = file?.case_file.model.id;
    if (!provider || !model) return;
    let cancelled = false;
    listKeys(idbVaultStore()).then(async (keys) => {
      const match = keys.find((key) => key.provider === provider && !key.locked);
      if (!match || cancelled) return;
      const secret = await revealKey(idbVaultStore(), match.id);
      if (cancelled) return;
      const preset = providerPreset(provider);
      const adapter = createAdapter(provider, { apiKey: secret, model, baseUrl: preset?.baseUrl });
      setAskComplete(() => (request: CompleteRequest) => adapter.complete(request));
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [file?.case_file.model.provider, file?.case_file.model.id]);

  const attachExport = async (upload: File) => {
    setAttachError('');
    try {
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const parsed = await parseConversationExport(upload.name, bytes);
      const actual = await exportFingerprint(parsed.conversations);
      if (attachResult(actual, file?.export_fingerprint) !== 'match') {
        setAttachError(ATTACH_MISMATCH);
        return;
      }
      setConversations(parsed.conversations);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : ATTACH_MISMATCH);
    }
  };

  if (authLoading || (!file && !error)) return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">{error}</p>;
  if (!file) return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>;

  const download = () => {
    const blob = new Blob([JSON.stringify(file.case_file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = caseDownloadName(file.filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportView
      caseFile={file.case_file}
      conversations={conversations}
      onDownload={download}
      onClose={() => navigate('/dashboard')}
      onAttachExport={(upload) => { attachExport(upload).catch(() => undefined); }}
      attachError={attachError}
      ask={{
        prices: {
          input: catalogModel(file.case_file.model.provider, file.case_file.model.id)?.input ?? 0,
          output: catalogModel(file.case_file.model.provider, file.case_file.model.id)?.output ?? 0,
        },
        complete: askComplete,
      }}
      onCaseFile={(next) => {
        setFile({ ...file, case_file: next });
        if (user && file.export_fingerprint) {
          saveCaseFile(user.id, file.export_fingerprint, file.filename ?? 'Export', next).catch(() => undefined);
        }
      }}
    />
  );
};

export default SavedCasePage;

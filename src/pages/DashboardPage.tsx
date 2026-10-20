import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { Button } from '../components/ui/button';
import { FileService, type UploadedFile } from '../services/fileService';
import { PremiumRequiredError, confirmPremiumCheckout, startPremiumCheckout } from '../services/billingService';
import { conversationsFromExport, readExportFile, type ParsedConversation } from '../lib/parseConversations';
import ConversationSelector from '../components/ConversationSelector';
import ExportDropzone, { type UploadStage } from '../components/upload/ExportDropzone';
import { toast } from 'sonner';
import { BarChart3, Crown, Loader2, Trash2 } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading, refresh } = usePremium(user?.id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [processing, setProcessing] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [parsedConversations, setParsedConversations] = useState<ParsedConversation[]>([]);
  const [originalFilename, setOriginalFilename] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    try {
      setFiles(await FileService.getUserFiles(user.id));
    } catch (error) {
      console.error(error);
      toast.error('Could not load your uploads');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchFiles();
  }, [user, navigate, fetchFiles]);

  useEffect(() => {
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    if (!user || !checkout) return;

    if (checkout === 'cancel') {
      toast.message('Checkout canceled. Premium stays locked.');
      setParams({}, { replace: true });
      return;
    }

    if (checkout === 'success' && sessionId) {
      confirmPremiumCheckout(sessionId)
        .then(async (unlocked) => {
          if (unlocked) {
            await refresh();
            toast.success('Premium is unlocked. Generate a report card.');
          } else {
            toast.message('Payment is still processing. Refresh in a moment.');
          }
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Could not confirm payment');
        })
        .finally(() => setParams({}, { replace: true }));
    }
  }, [params, refresh, setParams, user]);

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user) return;

    setStage('reading');
    try {
      await pause(280);
      const parsed = await readExportFile(file);
      setStage('parsing');
      await pause(220);
      const conversations = conversationsFromExport(parsed);
      setStage('counting');
      await pause(280);
      setParsedConversations(conversations);
      setOriginalFilename(file.name);
      setSelectorOpen(true);
      toast.success(`${conversations.length} conversation${conversations.length === 1 ? '' : 's'} ready to choose`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read that export');
    } finally {
      setStage('idle');
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/zip': ['.zip'],
    },
    maxFiles: 1,
    disabled: stage !== 'idle',
  });

  const handleUploadSelected = async (selected: ParsedConversation[], filename: string) => {
    if (!user) return;
    const uploaded = await FileService.uploadSelectedConversations(selected, user.id, filename);
    setFiles((current) => [uploaded, ...current]);
    setParsedConversations([]);
    setOriginalFilename('');
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Delete this upload and its reports?')) return;
    try {
      await FileService.deleteFile(fileId);
      setFiles((current) => current.filter((file) => file.id !== fileId));
      toast.success('Deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete that file');
    }
  };

  const unlock = async () => {
    setCheckoutLoading(true);
    try {
      const result = await startPremiumCheckout();
      if (result.alreadyPremium) {
        await refresh();
        toast.success('Premium is already unlocked');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const generate = async (fileId: string, reportType: 'basic' | 'premium') => {
    if (reportType === 'premium' && !isPremium) {
      await unlock();
      return;
    }
    setProcessing(`${fileId}:${reportType}`);
    try {
      if (reportType === 'basic') await FileService.generateBasicReport(fileId);
      else await FileService.generatePremiumReport(fileId);
      toast.success(reportType === 'basic' ? 'Basic report is ready' : 'Premium cards are ready');
      await fetchFiles();
      navigate(`/report/${fileId}/${reportType}`);
    } catch (error) {
      if (error instanceof PremiumRequiredError) {
        toast.message('Premium is locked on the server. Opening checkout.');
        await unlock();
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Report failed');
    } finally {
      setProcessing(null);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Studio</p>
          <h1 className="font-display text-5xl">Bring the archive in.</h1>
        </div>
        <div className="rounded-full border border-white/10 px-4 py-2 text-sm">
          {premiumLoading ? 'Checking unlock…' : isPremium ? 'Premium unlocked' : 'Free counts only'}
        </div>
      </div>

      {!isPremium && !premiumLoading && (
        <section className="mb-8 grid gap-6 overflow-hidden rounded-[28px] bg-primary text-primary-foreground md:grid-cols-[1.4fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em]">One-time unlock</p>
            <h2 className="mt-2 font-display text-4xl">The seven cards stay locked until you pay once.</h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base">
              Basic stats run free. Premium generation is refused by the server until Stripe records the purchase on your account.
            </p>
            <Button
              onClick={unlock}
              disabled={checkoutLoading}
              className="mt-6 h-12 rounded-full bg-[#111] px-6 text-white hover:bg-black"
            >
              {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
              Unlock premium
            </Button>
          </div>
          <div className="hidden items-end justify-end p-8 md:flex">
            <p className="font-display text-7xl leading-none">7</p>
          </div>
        </section>
      )}

      <ExportDropzone
        isDragActive={isDragActive}
        stage={stage}
        rootProps={getRootProps()}
        inputProps={getInputProps()}
      />
      <section className="mt-12">
        <h2 className="font-display text-3xl">Library</h2>
        {files.length === 0 ? (
          <p className="mt-4 max-w-lg text-muted-foreground">
            Nothing uploaded yet. After you drop a file, you choose which conversations to keep. The raw export is stored only so a report can be generated.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {files.map((file) => (
              <li key={file.id} className="rounded-[24px] border border-white/10 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.filename}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processing === `${file.id}:basic`}
                      onClick={() => file.has_basic_report ? navigate(`/report/${file.id}/basic`) : generate(file.id, 'basic')}
                    >
                      {processing === `${file.id}:basic` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                      {file.has_basic_report ? 'Basic report' : 'Run basic'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing === `${file.id}:premium`}
                      onClick={() => file.has_premium_report && isPremium ? navigate(`/report/${file.id}/premium`) : generate(file.id, 'premium')}
                    >
                      {processing === `${file.id}:premium` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                      {file.has_premium_report && isPremium ? 'Premium cards' : isPremium ? 'Run premium' : 'Unlock premium'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)} aria-label="Delete upload">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConversationSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        conversations={parsedConversations}
        originalFilename={originalFilename}
        onUploadSelected={handleUploadSelected}
      />
    </div>
  );
};

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default DashboardPage;

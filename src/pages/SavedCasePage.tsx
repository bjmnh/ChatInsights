import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReportView from '../components/insights/ReportView';
import { caseDownloadName } from '../lib/insights/hydratePremium';
import type { CaseFile } from '../lib/insights/merge';
import { getCaseFile } from '../services/caseFileService';

const SavedCasePage: React.FC = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<{ filename: string | null; case_file: CaseFile } | null>(null);
  const [error, setError] = useState('');

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

  return <ReportView caseFile={file.case_file} conversations={[]} onDownload={download} onClose={() => navigate('/dashboard')} />;
};

export default SavedCasePage;

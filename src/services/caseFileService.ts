import type { Json } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import type { CaseFile } from '../lib/insights/merge';
import { caseFileRow } from '../lib/insights/saveReport';

export async function saveCaseFile(userId: string, fingerprint: string, filename: string, caseFile: CaseFile) {
  const row = caseFileRow(userId, fingerprint, filename, caseFile);
  const { error } = await supabase.from('case_files').upsert({
    user_id: row.user_id,
    export_fingerprint: row.export_fingerprint,
    filename: row.filename,
    case_file: JSON.parse(JSON.stringify(row.case_file)) as Json,
    partial: row.partial,
    depth: row.depth,
    model_provider: row.model_provider,
    model_id: row.model_id,
    updated_at: row.updated_at,
  }, { onConflict: 'user_id,export_fingerprint' });
  if (error) throw new Error(error.message);
}

export interface SavedCaseSummary {
  id: string;
  filename: string | null;
  partial: boolean;
  depth: string;
  model_provider: string | null;
  model_id: string | null;
  updated_at: string;
}

export async function listCaseFiles(userId: string): Promise<SavedCaseSummary[]> {
  const { data, error } = await supabase
    .from('case_files')
    .select('id, filename, partial, depth, model_provider, model_id, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCaseFile(userId: string, id: string): Promise<{ filename: string | null; case_file: CaseFile } | null> {
  const { data, error } = await supabase
    .from('case_files')
    .select('filename, case_file')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { filename: data.filename, case_file: data.case_file as unknown as CaseFile };
}

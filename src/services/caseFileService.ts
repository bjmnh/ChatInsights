import type { Json } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import type { CaseFile } from '../lib/insights/merge';
import { caseFileRow } from '../lib/insights/saveReport';

export function readStoredCaseFile(value: unknown): CaseFile | null {
  if (!value) return null;
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed as CaseFile;
}

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
  created_at: string;
  export_fingerprint: string | null;
  case_file: CaseFile | null;
}

export async function listCaseFiles(userId: string): Promise<SavedCaseSummary[]> {
  const { data, error } = await supabase
    .from('case_files')
    .select('id, filename, partial, depth, model_provider, model_id, updated_at, created_at, export_fingerprint, case_file')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    partial: row.partial,
    depth: row.depth,
    model_provider: row.model_provider,
    model_id: row.model_id,
    updated_at: row.updated_at,
    created_at: row.created_at,
    export_fingerprint: row.export_fingerprint,
    case_file: readStoredCaseFile(row.case_file),
  }));
}

export async function getCaseFile(userId: string, id: string): Promise<{ filename: string | null; export_fingerprint: string | null; case_file: CaseFile } | null> {
  const { data, error } = await supabase
    .from('case_files')
    .select('filename, export_fingerprint, case_file')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    filename: data.filename,
    export_fingerprint: data.export_fingerprint,
    case_file: readStoredCaseFile(data.case_file) ?? (data.case_file as unknown as CaseFile),
  };
}

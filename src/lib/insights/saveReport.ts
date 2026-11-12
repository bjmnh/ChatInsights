import type { CaseFile } from './merge.ts';
import { isComplete } from './merge.ts';

export function reportConflictKey(userId: string, fingerprint: string): string {
  return `${userId}:${fingerprint}`;
}

export function upsertByConflict<T extends { userId: string; fingerprint: string }>(rows: T[], next: T): T[] {
  const key = reportConflictKey(next.userId, next.fingerprint);
  const index = rows.findIndex((row) => reportConflictKey(row.userId, row.fingerprint) === key);
  if (index === -1) return [...rows, next];
  const copy = rows.slice();
  copy[index] = next;
  return copy;
}

export function persistenceFields(caseFile: CaseFile): { partial: boolean } {
  const complete = isComplete(caseFile);
  if (!complete && caseFile.coverage.partial === false) {
    throw new Error('Refusing to save a partial report as a complete success');
  }
  return { partial: !complete };
}

export interface CaseFileRow {
  user_id: string;
  export_fingerprint: string;
  filename: string;
  case_file: CaseFile;
  partial: boolean;
  depth: string;
  model_provider: string;
  model_id: string;
  updated_at: string;
}

export function caseFileRow(userId: string, fingerprint: string, filename: string, caseFile: CaseFile): CaseFileRow {
  const fields = persistenceFields(caseFile);
  return {
    user_id: userId,
    export_fingerprint: fingerprint,
    filename,
    case_file: caseFile,
    partial: fields.partial,
    depth: caseFile.model.depth,
    model_provider: caseFile.model.provider,
    model_id: caseFile.model.id,
    updated_at: new Date().toISOString(),
  };
}

export async function exportFingerprint(conversations: { id: string; messages: { text: string }[] }[]): Promise<string> {
  const payload = conversations
    .map((conversation) => `${conversation.id}:${conversation.messages.length}:${conversation.messages[0]?.text.slice(0, 40) ?? ''}`)
    .join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class ArchiveUploadError extends Error {
  constructor(message = 'The copy could not be stored, so the analysis did not run.') {
    super(message);
    this.name = 'ArchiveUploadError';
  }
}

export const ARCHIVE_UNREACHABLE = 'We couldn\'t reach the server to store your file. Check your connection and try again.';
export const ARCHIVE_NOT_STORED = 'The copy could not be stored, so the analysis did not run.';
export const ARCHIVE_LOCAL_CONTINUES = 'The security-review copy was not stored. You can still read the file in this browser.';

const RAW_NETWORK = /failed to fetch|networkerror|network request failed|load failed|fetch failed|cors/i;

export function isUnreachableError(error: unknown): boolean {
  if (typeof error === 'string') return RAW_NETWORK.test(error);
  if (!(error instanceof Error)) return false;
  return error.name === 'TypeError' || RAW_NETWORK.test(error.message);
}

/** A failed security-review copy should not stop the in-browser parse. */
export function archiveSkipNotice(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : '';
  if (/too many uploads/i.test(raw)) return `${raw} ${ARCHIVE_LOCAL_CONTINUES}`;
  if (isUnreachableError(error)) return `${ARCHIVE_UNREACHABLE} ${ARCHIVE_LOCAL_CONTINUES}`;
  if (raw && !/analysis did not run/i.test(raw)) return `${raw} ${ARCHIVE_LOCAL_CONTINUES}`;
  return ARCHIVE_LOCAL_CONTINUES;
}

export function uploadFailureMessage(error: unknown, archived: boolean): string {
  if (!archived && isUnreachableError(error)) return ARCHIVE_UNREACHABLE;
  if (!archived) {
    if (error instanceof ArchiveUploadError && error.message && !isUnreachableError(error.message)) return error.message;
    return ARCHIVE_NOT_STORED;
  }
  const detail = error instanceof Error && error.message && !isUnreachableError(error)
    ? error.message
    : 'Could not read that export.';
  return `${detail} A copy of the file was stored for security review, and the analysis did not run.`;
}

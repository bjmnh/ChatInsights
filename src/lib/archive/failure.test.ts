import { describe, expect, it } from 'vitest';
import { ArchiveUploadError, ARCHIVE_LOCAL_CONTINUES, ARCHIVE_NOT_STORED, ARCHIVE_UNREACHABLE, archiveSkipNotice, uploadFailureMessage } from './failure';

describe('upload failure copy', () => {
  it('maps a raw fetch failure to one friendly sentence', () => {
    const message = uploadFailureMessage(new TypeError('Failed to fetch'), false);
    expect(message).toBe(ARCHIVE_UNREACHABLE);
    expect(message).not.toMatch(/failed to fetch/i);
  });

  it('does not append the raw fetch error after the storage sentence', () => {
    const message = uploadFailureMessage(new ArchiveUploadError(ARCHIVE_UNREACHABLE), false);
    expect(message).toBe(ARCHIVE_UNREACHABLE);
    expect(message).not.toContain(ARCHIVE_NOT_STORED);
    expect(message.split('\n')).toHaveLength(1);
  });

  it('lets a blocked copy continue as a local read and says how long to wait', () => {
    const message = archiveSkipNotice(new ArchiveUploadError('Too many uploads from this network. Try again in about 12 minutes.'));
    expect(message).toMatch(/12 minutes/);
    expect(message).toContain(ARCHIVE_LOCAL_CONTINUES);
    expect(message).not.toMatch(/analysis did not run/);
  });

  it('keeps a specific storage refusal', () => {
    const message = uploadFailureMessage(new ArchiveUploadError('That file type cannot be stored.'), false);
    expect(message).toBe('That file type cannot be stored.');
  });
});

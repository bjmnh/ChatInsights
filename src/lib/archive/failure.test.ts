import { describe, expect, it } from 'vitest';
import { ArchiveUploadError, ARCHIVE_NOT_STORED, ARCHIVE_UNREACHABLE, uploadFailureMessage } from './failure';

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

  it('keeps a specific storage refusal', () => {
    const message = uploadFailureMessage(new ArchiveUploadError('That file type cannot be stored.'), false);
    expect(message).toBe('That file type cannot be stored.');
  });
});

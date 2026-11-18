import { describe, expect, it } from 'vitest';
import { dropzoneGuard } from './gate';

describe('dropzone guard', () => {
  it('locks the picker until the acknowledgment is checked', () => {
    expect(dropzoneGuard(false, false)).toEqual({
      locked: true,
      disabled: true,
      noClick: true,
      noDrag: true,
      noKeyboard: true,
    });
  });

  it('opens the picker only after acknowledgment, and closes it while a read is in progress', () => {
    expect(dropzoneGuard(true, false)).toEqual({
      locked: false,
      disabled: false,
      noClick: false,
      noDrag: false,
      noKeyboard: false,
    });
    expect(dropzoneGuard(true, true).locked).toBe(true);
    expect(dropzoneGuard(true, true).noDrag).toBe(false);
  });
});

export interface PerReadNotices {
  retryNote: string;
  runError: string;
  saveMessage: string;
}

export const EMPTY_READ_NOTICES: PerReadNotices = {
  retryNote: '',
  runError: '',
  saveMessage: '',
};

/** Start over, a new file, and a new read drop notes that belonged to the previous run. */
export function noticesAfter(
  action: 'start-over' | 'new-file' | 'new-read' | 'retry-note',
  current: PerReadNotices,
  note = '',
): PerReadNotices {
  if (action === 'retry-note') return { ...current, retryNote: note, runError: '', saveMessage: '' };
  return { ...EMPTY_READ_NOTICES };
}

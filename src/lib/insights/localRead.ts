export const LOCAL_READ_CLEARED_EVENT = 'ci-local-read-cleared';

export interface CheckpointOwner {
  ownerId?: string | null;
  caseFile?: unknown;
  conversations?: readonly unknown[];
}

/**
 * Sign-out and account switches drop the previous person's local case file.
 * A storage read that briefly returns null must not, and an anonymous read
 * can still be adopted by the account created right after it.
 */
export function shouldClearLocalRead(previousUserId: string | null, nextUserId: string | null, event: string): boolean {
  if (!previousUserId || previousUserId === nextUserId) return false;
  if (event === 'STORAGE') return false;
  return true;
}

/** Anonymous checkpoints (no owner) stay visible, including after sign-up. Owned ones only show for that account. */
export function canShowCheckpoint(checkpoint: CheckpointOwner | null | undefined, userId: string | null): boolean {
  if (!checkpoint) return false;
  const hasRead = checkpoint.caseFile != null || (checkpoint.conversations?.length ?? 0) > 0;
  if (!hasRead) return false;
  if (checkpoint.ownerId == null) return true;
  return checkpoint.ownerId === userId;
}

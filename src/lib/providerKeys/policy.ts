export const KEY_RATE_LIMIT = 20;
export const KEY_RATE_WINDOW_MS = 60 * 60 * 1000;
export const KEY_MIN_LENGTH = 8;
export const KEY_MAX_LENGTH = 4096;

export function validateProviderId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,64}$/.test(value);
}

export function validateProviderSecret(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= KEY_MIN_LENGTH
    && value.length <= KEY_MAX_LENGTH
    && !/[\r\n]/.test(value);
}

export function keyHint(secret: string): string {
  return secret.slice(-4);
}

export function safeKeyError(message: string, action: 'save' | 'load'): string {
  if (message.includes('encryption is not configured')) {
    return 'Saving a key to your account is not available until the server encryption secret is set.';
  }
  if (message.includes('invalid key')) return 'That key cannot be saved. Use a single line of at least 8 characters.';
  if (message.includes('invalid provider')) return 'That provider cannot be saved.';
  if (message.includes('not authenticated')) return 'Sign in to save a key to your account.';
  return action === 'save'
    ? 'The key could not be saved to your account.'
    : 'The saved key could not be loaded.';
}

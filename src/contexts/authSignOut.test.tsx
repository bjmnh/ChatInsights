/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';

const clearLocalRead = vi.hoisted(() => vi.fn(async () => undefined));
const harness = vi.hoisted(() => {
  const listeners = new Set<(event: string, session: { user: { id: string; email: string } } | null) => void>();
  let session: { user: { id: string; email: string } } | null = {
    user: { id: 'user-a', email: 'a@example.com' },
  };
  return {
    listeners,
    read: () => session,
    failGlobal: false,
    signOut: (options?: { scope?: string }) => {
      if (harness.failGlobal && options?.scope !== 'local') {
        return Promise.resolve({ error: { message: 'Auth session missing!' } });
      }
      session = null;
      listeners.forEach((listener) => listener('SIGNED_OUT', null));
      return Promise.resolve({ error: null });
    },
    signIn: (id: string) => {
      session = { user: { id, email: `${id}@example.com` } };
      listeners.forEach((listener) => listener('SIGNED_IN', session));
    },
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('../lib/insights/browserStore', () => ({
  clearLocalRead: () => clearLocalRead(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: harness.read() } }),
      onAuthStateChange: (callback: (event: string, session: { user: { id: string; email: string } } | null) => void) => {
        harness.listeners.add(callback);
        callback('INITIAL_SESSION', harness.read());
        return { data: { subscription: { unsubscribe: () => harness.listeners.delete(callback) } } };
      },
      signOut: (options?: { scope?: string }) => harness.signOut(options),
      signInWithPassword: async () => ({ data: { user: harness.read()?.user ?? null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signInWithOAuth: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
    },
  },
}));

function Probe() {
  const { user, logout } = useAuth();
  return (
    <div>
      <p data-testid="user">{user?.id ?? 'none'}</p>
      <button type="button" onClick={() => { void logout(); }}>Log out</button>
    </div>
  );
}

describe('sign-out clears the local read', () => {
  it('drops the local case file when a signed-in user logs out, not when an anonymous visitor signs up', async () => {
    clearLocalRead.mockClear();
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user-a'));
    expect(clearLocalRead).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
    expect(clearLocalRead).toHaveBeenCalledTimes(1);

    harness.signIn('user-new');
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user-new'));
    expect(clearLocalRead).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('clears a missing auth session on log out and says the session expired', async () => {
    cleanup();
    harness.failGlobal = true;
    harness.signIn('user-a');
    clearLocalRead.mockClear();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user-a'));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
    expect(toast.message).toHaveBeenCalledWith('Your session expired. Please sign in again.');
    harness.failGlobal = false;
  });
});

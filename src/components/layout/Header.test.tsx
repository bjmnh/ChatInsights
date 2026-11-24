/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

const auth = vi.hoisted(() => ({
  user: null as { id: string; email?: string; user_metadata?: { name?: string } } | null,
  loading: false,
  logout: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

function draw() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('header auth', () => {
  afterEach(() => cleanup());

  it('links Sign in to the auth route once the session is known to be empty', () => {
    auth.user = null;
    auth.loading = false;
    draw();
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe('/auth');
  });

  it('does not show Sign in while the session is still loading', () => {
    auth.user = null;
    auth.loading = true;
    draw();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    expect(screen.getByTestId('header-auth-pending')).toBeTruthy();
  });

  it('shows the account menu from a known user before loading finishes', () => {
    auth.user = { id: 'user-1', email: 'ada@example.com', user_metadata: { name: 'Ada' } };
    auth.loading = true;
    draw();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    expect(screen.getByText('A')).toBeTruthy();
  });
});

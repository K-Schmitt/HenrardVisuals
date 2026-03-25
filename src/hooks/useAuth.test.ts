import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module to avoid env var validation at import time
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { useAuth } from './useAuth';

import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as {
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
};

const mockUnsubscribe = vi.fn();
let capturedAuthCallback: ((event: string, session: unknown) => void) | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  capturedAuthCallback = null;
  mockSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
    capturedAuthCallback = cb;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
});

describe('useAuth', () => {
  it('starts in loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resolves to unauthenticated when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resolves to authenticated when a session exists', async () => {
    const mockUser = { id: 'user-123', email: 'admin@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-abc' };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    const mockUser = { id: 'user-123', email: 'admin@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-abc' };

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.signInWithPassword.mockImplementation(async () => {
      capturedAuthCallback?.('SIGNED_IN', mockSession);
      return { data: { user: mockUser, session: mockSession }, error: null };
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn({ email: 'admin@example.com', password: 'password123' });
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'password123',
    });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('signIn throws and sets error on failure', async () => {
    const authError = { message: 'Invalid credentials', name: 'AuthApiError' };

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: authError,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.signIn({ email: 'wrong@example.com', password: 'wrongpass' });
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toMatchObject({ message: 'Invalid credentials' });
    await waitFor(() => {
      expect(result.current.error).toMatchObject({ message: 'Invalid credentials' });
    });
  });

  it('signOut clears user and session', async () => {
    const mockUser = { id: 'user-123', email: 'admin@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-abc' };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    mockSupabase.auth.signOut.mockImplementation(async () => {
      capturedAuthCallback?.('SIGNED_OUT', null);
      return { error: null };
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { unmount } = renderHook(() => useAuth());
    await waitFor(() => true);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

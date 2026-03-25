import type { AuthError, User, Session } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { AuthState, LoginCredentials, AuthContextValue } from '@/types';

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  error: null,
};

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          setState({ user: null, session: null, isLoading: false, error });
          return;
        }

        setState({ user: session?.user ?? null, session, isLoading: false, error: null });
      } catch {
        if (isMounted) {
          setState({ user: null, session: null, isLoading: false, error: null });
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!isMounted) return;
      setState((prev) => ({ ...prev, user: session?.user ?? null, session, isLoading: false, error: null }));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const runAuthAction = useCallback(
    async (action: () => Promise<{ error: AuthError | null }>): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const { error } = await action();
        if (error) throw error;
      } catch (err) {
        const authError = err as AuthError;
        setState((prev) => ({ ...prev, isLoading: false, error: authError }));
        throw authError;
      }
    },
    []
  );

  const signIn = useCallback(
    (credentials: LoginCredentials) =>
      runAuthAction(() => supabase.auth.signInWithPassword(credentials)),
    [runAuthAction]
  );

  const signOut = useCallback(
    () => runAuthAction(() => supabase.auth.signOut()),
    [runAuthAction]
  );

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}

export default useAuth;

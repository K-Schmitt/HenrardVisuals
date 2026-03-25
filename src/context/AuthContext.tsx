import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { AuthContextValue, AuthState, LoginCredentials } from '@/types';

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isLoading: false,
        error: null,
      }));
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

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, isAuthenticated: !!state.user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

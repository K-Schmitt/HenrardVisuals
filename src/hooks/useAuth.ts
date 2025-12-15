// =========================================
// useAuth Hook
// Authentication State Management
// =========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthState, LoginCredentials, AuthContextValue } from '@/types';
import type { AuthError, User, Session } from '@supabase/supabase-js';

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  error: null,
};

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(initialState);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            error,
          });
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          error: null,
        });
      } catch {
        if (isMounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        }
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!isMounted) return;

      setState((prev: AuthState) => ({
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

  // Sign in with email and password
  const signIn = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setState((prev: AuthState) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      setState({
        user: data.user,
        session: data.session,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const authError = error as AuthError;
      setState((prev: AuthState) => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      throw authError;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    setState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setState((prev: AuthState) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      setState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const authError = error as AuthError;
      setState((prev: AuthState) => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      throw authError;
    }
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };
}

// ----------------------------------------
// useUser Hook (convenience)
// ----------------------------------------

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

// ----------------------------------------
// useSession Hook (convenience)
// ----------------------------------------

export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}

export default useAuth;

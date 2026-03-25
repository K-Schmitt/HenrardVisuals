import type { User, Session } from '@supabase/supabase-js';

// Auth logic lives in AuthContext so a single subscription is shared
// across the entire tree — re-exported here for backward compatibility.
export { useAuth } from '@/context/AuthContext';

import { useAuth } from '@/context/AuthContext';

/** Convenience wrapper — reads from the shared AuthContext. */
export function useUser(): User | null {
  return useAuth().user;
}

/** Convenience wrapper — reads from the shared AuthContext. */
export function useSession(): Session | null {
  return useAuth().session;
}

export default useAuth;

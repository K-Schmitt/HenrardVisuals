/**
 * Type Definitions for HenrardVisuals
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';

// ----------------------------------------
// Database Types
// ----------------------------------------

export type Photo = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  is_published: boolean;
  is_hero: boolean;
  sort_order: number;
  metadata: PhotoMetadata;
  created_at: string;
  updated_at: string;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutter_speed?: string;
  location?: string;
  tags?: string[];
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo_id: string | null;
  sort_order: number;
  created_at: string;
}

export type SiteSettingsRow = {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface ProfileSettings {
  subtitle: string;
  subtitle_en?: string;
  stats: ProfileStat[];
  attributes: string;
  attributes_en?: string;
  biography: string;
  biography_en?: string;
}

export interface ProfileStat {
  value: string;
  unit: string;
  label: string;
  label_en?: string;
}

// ----------------------------------------
// Auth Types
// ----------------------------------------

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  /** True when the session JWT carries app_metadata.role === 'admin'.
   *  UX gating only — public.is_admin() in RLS is the real control. */
  isAdmin: boolean;
}

export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: AuthError) => void;
}

// ----------------------------------------
// Supabase Database Types
// ----------------------------------------

export interface Database {
  public: {
    Tables: {
      // Relationships is required by Supabase's GenericSchema constraint. The
      // schema declares no foreign keys the client needs to traverse, so the
      // arrays are empty — but omitting them makes the whole schema fail the
      // constraint, which silently degrades rpc() and from() to `any`.
      photos: {
        Row: Photo;
        Insert: Omit<Photo, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Photo, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Omit<SiteSettingsRow, 'updated_at'>;
        Update: Partial<Omit<SiteSettingsRow, 'updated_at'>>;
        Relationships: [];
      };
    };
    // Required by Supabase GenericSchema — empty but present so the client's
    // overload resolution can distinguish Tables from Views and Functions.
    Views: Record<string, never>;
    Functions: {
      /** Clears the current hero and sets a new one in one statement.
       *  Defined in supabase/migrations/004; locked down in 005. */
      set_hero_photo: {
        Args: { target_id: string };
        Returns: undefined;
      };
    };
  };
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  publicUrl: string;
  /** Intrinsic pixel size, null when the file did not decode. */
  width: number | null;
  height: number | null;
}

/** Union of all public table names — used for type-safe DB helpers */
export type PublicTableName = keyof Database['public']['Tables'];

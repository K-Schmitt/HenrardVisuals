/**
 * Type Definitions for HenrardVisuals
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';

// ----------------------------------------
// Database Types
// ----------------------------------------

export interface Photo {
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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface SiteSettingsRow {
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
      photos: {
        Row: Photo;
        Insert: Omit<Photo, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Photo, 'id' | 'created_at' | 'updated_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Omit<SiteSettingsRow, 'updated_at'>;
        Update: Partial<Omit<SiteSettingsRow, 'updated_at'>>;
      };
    };
    // Required by Supabase GenericSchema — empty but present so the client's
    // overload resolution can distinguish Tables from Views and Functions.
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  publicUrl: string;
}

/** Union of all public table names — used for type-safe DB helpers */
export type PublicTableName = keyof Database['public']['Tables'];

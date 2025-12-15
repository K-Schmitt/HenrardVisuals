/**
 * Supabase Client Configuration
 */

/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Get public URL for a storage file
 */
export function getStorageUrl(path: string, bucket = 'photos'): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get transformed image URL with optional resizing
 */
export function getImageUrl(
  path: string,
  options?: { width?: number; height?: number; quality?: number }
): string {
  const { width, height, quality = 80 } = options ?? {};
  const transform: Record<string, number> = { quality };

  if (width) transform.width = width;
  if (height) transform.height = height;

  const { data } = supabase.storage.from('photos').getPublicUrl(path, { transform });
  return data.publicUrl;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  file: File,
  path: string,
  bucket = 'photos'
): Promise<{ path: string; error: Error | null }> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    return { path: '', error: new Error(error.message) };
  }

  return { path: data.path, error: null };
}

/**
 * Insert a row into a table (uses any to bypass strict typing)
 */
export async function insertRow<T>(
  table: string,
  data: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: result as T, error: null };
}

/**
 * Update a row in a table
 */
export async function updateRow<T>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: result as T, error: null };
}

/**
 * Update multiple rows in a table
 */
export async function updateRows(
  table: string,
  data: Record<string, unknown>,
  filter: { column: string; value: unknown }
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from(table)
    .update(data)
    .eq(filter.column, filter.value);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

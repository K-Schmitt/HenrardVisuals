/**
 * Supabase Client Configuration
 */

/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

import type { Database, PublicTableName } from '@/types';

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

// The only `any` in src/. supabase-js resolves Insert/Update/Row through
// conditional types indexed by the table name; with a generic T the compiler
// cannot prove the conditional collapses to one branch, so `.insert()`,
// `.update()` and `.eq()` reject arguments that are in fact correct.
// Re-checked after the Database type was fixed to satisfy GenericSchema —
// still required. The cast is centralised here so callers stay clean, and the
// public wrappers below re-impose the real types on their way out.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const typedFrom = <T extends PublicTableName>(table: T): any => supabase.from(table);

/**
 * Get public URL for a storage file
 */
export function getStorageUrl(path: string, bucket = 'photos'): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
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
 * Insert a row into a typed table
 */
export async function insertRow<T extends PublicTableName>(
  table: T,
  data: Database['public']['Tables'][T]['Insert']
): Promise<{
  data: Database['public']['Tables'][T]['Row'] | null;
  error: Error | null;
}> {
  const { data: result, error } = await typedFrom(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: result, error: null };
}

/**
 * Update a row by id in a typed table
 */
export async function updateRow<T extends PublicTableName>(
  table: T,
  id: string,
  data: Database['public']['Tables'][T]['Update']
): Promise<{
  data: Database['public']['Tables'][T]['Row'] | null;
  error: Error | null;
}> {
  const { data: result, error } = await typedFrom(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: result, error: null };
}

/**
 * Update multiple rows matching a filter in a typed table
 */
export async function updateRows<T extends PublicTableName>(
  table: T,
  data: Database['public']['Tables'][T]['Update'],
  filter: { column: string; value: unknown }
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom(table)
    .update(data)
    .eq(filter.column as string, filter.value);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

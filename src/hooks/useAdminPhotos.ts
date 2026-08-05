import { useState, useEffect, useCallback, useRef } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import { supabase, typedFrom, updateRow } from '@/lib/supabase';
import type { Photo, Category, UploadedFile } from '@/types';

interface Message {
  type: 'success' | 'error';
  text: string;
}

/** The editable half of a photo's caption block. */
export type PhotoCredits = Pick<
  Photo,
  'description' | 'shot_location' | 'shot_year' | 'photographer'
>;

const MESSAGE_TIMEOUT_MS = 3_000;
const UPLOAD_MESSAGE_TIMEOUT_MS = 5_000;

export function useAdminPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  // Through a ref for the same reason as CategoryManager: t's identity changes
  // on every language switch, and these callbacks feed a useEffect that would
  // then refetch everything on each FR/EN toggle.
  const tRef = useRef(t);
  tRef.current = t;

  const showMessage = useCallback((msg: Message, timeout = MESSAGE_TIMEOUT_MS) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), timeout);
  }, []);

  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setPhotos(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tRef.current('admin.photos.loadError'));
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (fetchError) throw fetchError;
      setCategories(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tRef.current('admin.photos.categoriesLoadError'));
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    fetchCategories();
  }, [fetchPhotos, fetchCategories]);

  const saveUploadedFiles = useCallback(
    async (files: UploadedFile[]) => {
      let saved = 0;
      const errors: string[] = [];

      // One round trip for the whole batch. The previous version inserted one
      // row per request, so a 20-photo upload cost 20 sequential round trips.
      const rows = files.map((file) => ({
        title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        storage_path: file.path,
        file_size: file.size,
        is_published: false,
        is_hero: false,
        sort_order: 0,
        description: null,
        category: null,
        thumbnail_path: null,
        width: file.width,
        height: file.height,
        mime_type: null,
        // Caption and credit are filled in from the panel after upload; the
        // gallery omits whichever half is still missing.
        shot_location: null,
        shot_year: null,
        photographer: null,
        metadata: {},
      }));

      try {
        const { error } = await typedFrom('photos').insert(rows);
        if (error) errors.push(error.message);
        else saved = rows.length;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : tRef.current('admin.photos.unknownError'));
      }

      if (errors.length > 0) {
        showMessage(
          {
            type: 'error',
            text: tRef.current('admin.photos.saveErrors', {
              count: errors.length,
              first: errors[0],
            }),
          },
          UPLOAD_MESSAGE_TIMEOUT_MS
        );
      } else {
        showMessage(
          {
            type: 'success',
            text: tRef.current('admin.photos.savedCount', {
              saved,
              total: files.length,
            }),
          },
          UPLOAD_MESSAGE_TIMEOUT_MS
        );
      }
      fetchPhotos();
    },
    [fetchPhotos, showMessage]
  );

  const togglePublish = useCallback(
    async (photo: Photo) => {
      try {
        const { error } = await updateRow('photos', photo.id, { is_published: !photo.is_published });
        if (error) throw error;
        fetchPhotos();
      } catch (err) {
        const msg = err instanceof Error ? err.message : tRef.current('admin.photos.updateError');
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );

  const deletePhoto = useCallback(
    // Confirmation is handled by the caller (PhotoCard) — this function deletes unconditionally.
    async (photo: Photo) => {
      try {
        // Object first, row second. The row is what makes the object findable
        // in the admin panel, so if the storage delete fails the row survives
        // and the operation can be retried. The reverse ordering left the file
        // publicly retrievable at its URL forever.
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([photo.storage_path]);
        if (storageError) throw storageError;

        const { error } = await supabase.from('photos').delete().eq('id', photo.id);
        if (error) throw error;
        fetchPhotos();
        showMessage({ type: 'success', text: tRef.current('admin.photos.deleteSuccess') });
      } catch (err) {
        const msg = err instanceof Error ? err.message : tRef.current('admin.photos.deleteError');
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );

  const updatePhotoCategory = useCallback(
    async (photoId: string, categorySlug: string | null) => {
      try {
        const { error } = await updateRow('photos', photoId, { category: categorySlug });
        if (error) throw error;
        fetchPhotos();
        showMessage({ type: 'success', text: tRef.current('admin.photos.categoryUpdated') });
      } catch (err) {
        const msg = err instanceof Error ? err.message : tRef.current('admin.photos.updateError');
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );

  /**
   * The caption line ("01 — ÉDITORIAL / PARIS, 2025"), the lightbox credit and
   * the pull quote the centre row sets. Sent as one update so a half-filled
   * caption is never persisted.
   */
  const updatePhotoCredits = useCallback(
    async (photoId: string, credits: PhotoCredits) => {
      try {
        const { error } = await updateRow('photos', photoId, credits);
        if (error) throw error;
        fetchPhotos();
        showMessage({ type: 'success', text: tRef.current('admin.photos.creditsUpdated') });
      } catch (err) {
        const msg = err instanceof Error ? err.message : tRef.current('admin.photos.updateError');
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );

  const toggleHero = useCallback(
    async (photo: Photo) => {
      try {
        // set_hero_photo() (migration 004) clears the previous hero and sets
        // the new one in one statement. The old two-step version could leave
        // the site with no hero at all if the second write failed.
        if (photo.is_hero) {
          const { error } = await updateRow('photos', photo.id, { is_hero: false });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc('set_hero_photo', { target_id: photo.id });
          if (error) throw error;
        }
        fetchPhotos();
        showMessage({
          type: 'success',
          text: photo.is_hero
            ? tRef.current('admin.photos.heroRemoved')
            : tRef.current('admin.photos.heroSet'),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : tRef.current('admin.photos.updateError');
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );

  const showError = useCallback(
    (text: string) => showMessage({ type: 'error', text }),
    [showMessage]
  );

  return {
    photos,
    categories,
    loadingPhotos,
    message,
    error,
    saveUploadedFiles,
    showError,
    togglePublish,
    deletePhoto,
    updatePhotoCategory,
    updatePhotoCredits,
    toggleHero,
  };
}

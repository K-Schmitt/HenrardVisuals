import { useState, useEffect, useCallback } from 'react';

import { supabase, typedFrom, updateRow } from '@/lib/supabase';
import type { Photo, Category, UploadedFile } from '@/types';

interface Message {
  type: 'success' | 'error';
  text: string;
}

const MESSAGE_TIMEOUT_MS = 3_000;
const UPLOAD_MESSAGE_TIMEOUT_MS = 5_000;

export function useAdminPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des photos');
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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des catégories');
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
        metadata: {},
      }));

      try {
        const { error } = await typedFrom('photos').insert(rows);
        if (error) errors.push(error.message);
        else saved = rows.length;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Erreur inconnue');
      }

      if (errors.length > 0) {
        showMessage(
          { type: 'error', text: `${errors.length} erreur(s): ${errors[0]}` },
          UPLOAD_MESSAGE_TIMEOUT_MS
        );
      } else {
        showMessage(
          { type: 'success', text: `${saved}/${files.length} photo(s) enregistrée(s)!` },
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
        const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
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
        showMessage({ type: 'success', text: 'Photo supprimée' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
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
        showMessage({ type: 'success', text: 'Catégorie mise à jour' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
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
          text: photo.is_hero ? 'Image héros retirée' : 'Image héros définie',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
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
    toggleHero,
  };
}

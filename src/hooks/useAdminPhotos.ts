import { useState, useEffect, useCallback } from 'react';

import { supabase, typedFrom, insertRow, updateRow } from '@/lib/supabase';
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
      for (const file of files) {
        try {
          const { error } = await insertRow('photos', {
            title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            storage_path: file.path,
            file_size: file.size,
            is_published: false,
            is_hero: false,
            sort_order: 0,
            description: null,
            category: null,
            thumbnail_path: null,
            width: null,
            height: null,
            mime_type: null,
            metadata: {},
          });
          if (!error) saved++;
        } catch (err) {
          console.error('Error saving photo:', err);
        }
      }
      showMessage(
        { type: 'success', text: `${saved}/${files.length} photo(s) enregistrée(s)!` },
        UPLOAD_MESSAGE_TIMEOUT_MS
      );
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
        // Step 1 — clear any existing hero photo.
        // Note: these two operations are sequential, not transactional.
        // Use the set_hero_photo() DB function (migration 004) for true atomicity.
        if (!photo.is_hero) {
          const { error: clearError } = await typedFrom('photos')
            .update({ is_hero: false })
            .neq('id', photo.id);
          if (clearError) throw clearError;
        }
        // Step 2 — toggle hero on the target photo.
        const { error } = await updateRow('photos', photo.id, { is_hero: !photo.is_hero });
        if (error) throw error;
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

  return {
    photos,
    categories,
    loadingPhotos,
    message,
    error,
    saveUploadedFiles,
    togglePublish,
    deletePhoto,
    updatePhotoCategory,
    toggleHero,
  };
}

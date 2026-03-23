import { useState, useEffect, useCallback } from 'react';
import { supabase, insertRow, updateRow } from '@/lib/supabase';
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

  const showMessage = useCallback((msg: Message, timeout = MESSAGE_TIMEOUT_MS) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), timeout);
  }, []);

  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPhotos(data ?? []);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data ?? []);
    } catch (err) {
      console.error('Error fetching categories:', err);
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
        console.error('Error updating photo:', err);
      }
    },
    [fetchPhotos]
  );

  const deletePhoto = useCallback(
    async (photo: Photo) => {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo?')) return;
      try {
        const { error } = await supabase.from('photos').delete().eq('id', photo.id);
        if (error) throw error;
        fetchPhotos();
        showMessage({ type: 'success', text: 'Photo supprimée' });
      } catch (err) {
        console.error('Error deleting photo:', err);
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
        console.error('Error updating photo category:', err);
        showMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
      }
    },
    [fetchPhotos, showMessage]
  );

  const toggleHero = useCallback(
    async (photo: Photo) => {
      try {
        if (!photo.is_hero) {
          await supabase.from('photos').update({ is_hero: false } as never).neq('id', photo.id);
        }
        const { error } = await updateRow('photos', photo.id, { is_hero: !photo.is_hero });
        if (error) throw error;
        fetchPhotos();
        showMessage({
          type: 'success',
          text: photo.is_hero ? 'Image héros retirée' : 'Image héros définie',
        });
      } catch (err) {
        console.error('Error updating hero status:', err);
        showMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
      }
    },
    [fetchPhotos, showMessage]
  );

  return {
    photos,
    categories,
    loadingPhotos,
    message,
    saveUploadedFiles,
    togglePublish,
    deletePhoto,
    updatePhotoCategory,
    toggleHero,
  };
}

import { useState, useCallback, useEffect } from 'react';

import type { Photo } from '@/types';

export function useLightbox(photos: Photo[]) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const closeModal = useCallback(() => setSelectedPhoto(null), []);

  const goToPreviousPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const idx = photos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(photos[idx > 0 ? idx - 1 : photos.length - 1]);
  }, [selectedPhoto, photos]);

  const goToNextPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const idx = photos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(photos[idx < photos.length - 1 ? idx + 1 : 0]);
  }, [selectedPhoto, photos]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') goToPreviousPhoto();
      else if (e.key === 'ArrowRight') goToNextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, closeModal, goToPreviousPhoto, goToNextPhoto]);

  return { selectedPhoto, setSelectedPhoto, closeModal, goToPreviousPhoto, goToNextPhoto };
}

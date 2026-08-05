import { HeroSection } from '@/components/HeroSection';
import { ContactSection } from '@/components/Layout/ContactSection';
import { PhotoGallery } from '@/components/PhotoGallery';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useHomeData } from '@/hooks/useHomeData';
import { useLightbox } from '@/hooks/useLightbox';

export function Home() {
  const { t } = useLanguage();
  useDocumentMeta({ title: t('meta.home.title'), description: t('meta.home.description') });

  const {
    photos,
    heroPhoto,
    categories,
    profileSettings,
    activeFilter,
    setActiveFilter,
    currentPage,
    setCurrentPage,
    totalCount,
    pageSize,
    isLoading,
    error,
  } = useHomeData();

  const { selectedPhoto, setSelectedPhoto, closeModal, goToPreviousPhoto, goToNextPhoto } =
    useLightbox(photos);

  const selectedIndex = selectedPhoto ? photos.findIndex((p) => p.id === selectedPhoto.id) : -1;

  // The lightbox wraps at both ends, so the neighbours of the first plate are
  // the second and the last.
  const neighbourPaths =
    selectedIndex < 0
      ? []
      : [
          photos[(selectedIndex + 1) % photos.length],
          photos[(selectedIndex - 1 + photos.length) % photos.length],
        ].flatMap((p) => (p && p.id !== selectedPhoto?.id ? [p.storage_path] : []));

  return (
    <div className="min-h-screen bg-ink text-bone">
      <HeroSection heroPhoto={heroPhoto} profileSettings={profileSettings} />

      <PhotoGallery
        photos={photos}
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onPhotoClick={setSelectedPhoto}
        isLoading={isLoading}
        error={error}
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <ContactSection index="05" />

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          index={selectedIndex}
          total={photos.length}
          onClose={closeModal}
          onPrevious={goToPreviousPhoto}
          onNext={goToNextPhoto}
          neighbourPaths={neighbourPaths}
        />
      )}
    </div>
  );
}

export default Home;

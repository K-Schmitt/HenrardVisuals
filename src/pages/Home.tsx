import { useHomeData } from '@/hooks/useHomeData';
import { HeroSection } from '@/components/HeroSection';
import { PhotoGallery } from '@/components/PhotoGallery';
import { PhotoLightbox } from '@/components/PhotoLightbox';

export function Home() {
  const {
    filteredPhotos,
    heroPhoto,
    categories,
    profileSettings,
    activeFilter,
    setActiveFilter,
    selectedPhoto,
    setSelectedPhoto,
    closeModal,
    goToPreviousPhoto,
    goToNextPhoto,
    isLoading,
    error,
  } = useHomeData();

  const selectedIndex = selectedPhoto
    ? filteredPhotos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection heroPhoto={heroPhoto} profileSettings={profileSettings} />

      <PhotoGallery
        photos={filteredPhotos}
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onPhotoClick={setSelectedPhoto}
        isLoading={isLoading}
        error={error}
      />

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          index={selectedIndex}
          total={filteredPhotos.length}
          onClose={closeModal}
          onPrevious={goToPreviousPhoto}
          onNext={goToNextPhoto}
        />
      )}
    </div>
  );
}

export default Home;

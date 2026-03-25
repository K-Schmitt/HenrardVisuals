import { HeroSection } from '@/components/HeroSection';
import { PhotoGallery } from '@/components/PhotoGallery';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { useHomeData } from '@/hooks/useHomeData';
import { useLightbox } from '@/hooks/useLightbox';

export function Home() {
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

  return (
    <div className="min-h-screen bg-black text-white">
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

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          index={selectedIndex}
          total={photos.length}
          onClose={closeModal}
          onPrevious={goToPreviousPhoto}
          onNext={goToNextPhoto}
        />
      )}
    </div>
  );
}

export default Home;

import { PhotoCard } from '@/components/Admin/PhotoCard';
import { FileUpload } from '@/components/Upload/FileUpload';
import { useLanguage } from '@/context/LanguageContext';
import { useAdminPhotos } from '@/hooks/useAdminPhotos';

export function PhotosTab() {
  const { t } = useLanguage();
  const {
    photos,
    categories,
    loadingPhotos,
    message,
    saveUploadedFiles,
    showError,
    togglePublish,
    deletePhoto,
    updatePhotoCategory,
    toggleHero,
  } = useAdminPhotos();

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 rounded-elegant ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="mb-12">
        <h2 className="font-serif text-xl text-gray-900 mb-4">{t('admin.photos.uploadTitle')}</h2>
        <FileUpload
          onUploadComplete={saveUploadedFiles}
          onError={showError}
        />
      </section>

      <section>
        <h2 className="font-serif text-xl text-gray-900 mb-4">{t('admin.photos.countLabel')} ({photos.length})</h2>

        {loadingPhotos && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
          </div>
        )}

        {!loadingPhotos && photos.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            {t('admin.photos.empty')}
          </p>
        )}

        {!loadingPhotos && photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                categories={categories}
                onTogglePublish={togglePublish}
                onToggleHero={toggleHero}
                onDelete={deletePhoto}
                onUpdateCategory={updatePhotoCategory}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default PhotosTab;

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Login } from '@/components/Auth/Login';
import { FileUpload } from '@/components/Upload/FileUpload';
import { CategoryManager } from '@/components/Admin/CategoryManager';
import { ProfileSettings } from '@/components/Admin/ProfileSettings';
import { AccountSettings } from '@/components/Admin/AccountSettings';
import { supabase, insertRow, updateRow, getStorageUrl } from '@/lib/supabase';

interface Photo {
  id: string;
  title: string;
  storage_path: string;
  is_published: boolean;
  is_hero: boolean;
  category: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export function Admin() {
  const { isAuthenticated, user, signOut, isLoading } = useAuth();
  const [uploadMessage, setUploadMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [activeTab, setActiveTab] = useState<'photos' | 'categories' | 'settings' | 'account'>('photos');

  // Fetch photos on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchPhotos();
      fetchCategories();
    }
  }, [isAuthenticated]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const savePhotoToDatabase = async (file: { name: string; path: string; size: number }) => {
    try {
      const { error } = await insertRow('photos', {
        title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        storage_path: file.path,
        file_size: file.size,
        is_published: false,
        sort_order: 0,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error saving photo:', err);
      return false;
    }
  };

  const togglePublish = async (photo: Photo) => {
    try {
      const { error } = await updateRow('photos', photo.id, {
        is_published: !photo.is_published,
      });

      if (error) throw error;
      fetchPhotos();
    } catch (err) {
      console.error('Error updating photo:', err);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo?')) return;

    try {
      const { error } = await supabase.from('photos').delete().eq('id', photo.id);

      if (error) throw error;
      fetchPhotos();
      setUploadMessage({ type: 'success', text: 'Photo supprimée' });
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const updatePhotoCategory = async (photoId: string, categorySlug: string | null) => {
    try {
      const { error } = await updateRow('photos', photoId, {
        category: categorySlug,
      });

      if (error) throw error;
      fetchPhotos();
      setUploadMessage({ type: 'success', text: 'Catégorie mise à jour' });
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      console.error('Error updating photo category:', err);
      setUploadMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
      setTimeout(() => setUploadMessage(null), 3000);
    }
  };

  const toggleHero = async (photo: Photo) => {
    try {
      // Si on définit cette photo comme héros, on retire le statut héros des autres
      if (!photo.is_hero) {
        // Reset all other photos to not be hero
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('photos').update({ is_hero: false }).neq('id', photo.id);
      }

      const { error } = await updateRow('photos', photo.id, {
        is_hero: !photo.is_hero,
      });

      if (error) throw error;
      fetchPhotos();
      setUploadMessage({
        type: 'success',
        text: photo.is_hero ? 'Image héros retirée' : 'Image héros définie',
      });
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      console.error('Error updating hero status:', err);
      setUploadMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
      setTimeout(() => setUploadMessage(null), 3000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <Login onSuccess={() => {}} />
      </div>
    );
  }

  // Authenticated - show admin panel
  return (
    <div className="min-h-screen px-6 lg:px-12 pt-32 pb-12 bg-white text-black">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-display-sm text-gray-900">Admin Panel</h1>
          <p className="text-body-md text-gray-500 mt-1">Welcome back, {user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-elegant hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {(['photos', 'categories', 'settings', 'account'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Success/Error Message */}
      {uploadMessage && (
        <div
          className={`mb-6 p-4 rounded-elegant ${
            uploadMessage.type === 'success'
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}
        >
          {uploadMessage.text}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div>
          {/* Upload Section */}
          <section className="mb-12">
            <h2 className="font-serif text-xl text-gray-900 mb-4">Upload Photos</h2>
            <FileUpload
              onUploadComplete={async (files) => {
                let saved = 0;
                for (const file of files) {
                  const success = await savePhotoToDatabase(file);
                  if (success) saved++;
                }
                setUploadMessage({
                  type: 'success',
                  text: `${saved}/${files.length} photo(s) enregistrée(s)!`,
                });
                fetchPhotos();
                setTimeout(() => setUploadMessage(null), 5000);
              }}
              onError={(error) => {
                setUploadMessage({ type: 'error', text: error });
                setTimeout(() => setUploadMessage(null), 5000);
              }}
            />
          </section>

          {/* Photos Grid */}
          <section>
            <h2 className="font-serif text-xl text-gray-900 mb-4">Your Photos ({photos.length})</h2>

            {loadingPhotos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
              </div>
            ) : photos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Aucune photo. Uploadez votre première photo ci-dessus!
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative bg-gray-50 border border-gray-200 rounded-elegant overflow-hidden"
                  >
                    {/* Image container with hover actions */}
                    <div className="relative group">
                      <img
                        src={getStorageUrl(photo.storage_path)}
                        alt={photo.title}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23666">No Image</text></svg>';
                        }}
                      />
                      {/* Hover Actions - Only on image */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => togglePublish(photo)}
                          className="px-3 py-1 bg-accent-500 text-white rounded text-sm hover:bg-accent-600"
                        >
                          {photo.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => toggleHero(photo)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          {photo.is_hero ? 'Remove Hero' : 'Set as Hero'}
                        </button>
                        <button
                          onClick={() => deletePhoto(photo)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Info section - Always accessible */}
                    <div className="p-3">
                      <p className="text-gray-900 text-sm truncate mb-2">{photo.title}</p>

                      {/* Category Selector */}
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
                        <select
                          value={photo.category || ''}
                          onChange={(e) => updatePhotoCategory(photo.id, e.target.value || null)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-200 rounded text-gray-900 focus:outline-none focus:border-black hover:border-gray-400 transition-colors"
                        >
                          <option value="">Sans catégorie</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.slug}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            photo.is_published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {photo.is_published ? 'Published' : 'Draft'}
                        </span>
                        {photo.is_hero && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Hero
                          </span>
                        )}
                        {photo.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                            {categories.find((c) => c.slug === photo.category)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && <CategoryManager />}

      {/* Settings Tab */}
      {activeTab === 'settings' && <ProfileSettings />}

      {/* Account Tab */}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}

export default Admin;

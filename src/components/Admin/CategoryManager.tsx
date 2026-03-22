import { useState, useEffect } from 'react';
import { supabase, insertRow, updateRow } from '@/lib/supabase';
import type { Category } from '@/types';

// SVG Icons inline
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      showMessage('error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      sort_order: categories.length,
    });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setIsCreating(false);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sort_order: category.sort_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', slug: '', description: '', sort_order: 0 });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'Category name is required');
      return;
    }

    try {
      if (isCreating) {
        // Create new category using helper
        const { error } = await insertRow('categories', {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          cover_photo_id: null,
          sort_order: formData.sort_order,
        });

        if (error) throw error;
        showMessage('success', 'Category created successfully');
      } else if (editingId) {
        // Update existing category using helper
        const { error } = await updateRow('categories', editingId, {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          sort_order: formData.sort_order,
        });

        if (error) throw error;
        showMessage('success', 'Category updated successfully');
      }

      cancelEdit();
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      showMessage('error', 'Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;
      showMessage('success', 'Category deleted successfully');
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      showMessage('error', 'Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Message */}
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-gray-900">Categories ({categories.length})</h2>
        {!isCreating && !editingId && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors"
          >
            <PlusIcon />
            New Category
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-elegant">
          <h3 className="font-medium text-gray-900 mb-4">
            {isCreating ? 'Create New Category' : 'Edit Category'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder="e.g., Editorial, Runway, Polaroids"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Slug (auto-generated)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder="e.g., editorial"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                min="0"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors"
              >
                <SaveIcon />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-elegant hover:bg-gray-300 transition-colors"
              >
                <XIcon />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-elegant">
          <p className="text-gray-500 mb-2">No categories yet</p>
          <p className="text-gray-400 text-sm">
            Create your first category to organize your portfolio
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-white border border-gray-200 rounded-elegant hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{category.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">/{category.slug}</p>
                  {category.description && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Order: {category.sort_order}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2 text-gray-400 hover:text-black transition-colors"
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryManager;

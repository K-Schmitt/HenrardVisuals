import { useState, useEffect, useCallback } from 'react';

import { CategoryForm, type CategoryFormData } from '@/components/Admin/CategoryForm';
import { CategoryList } from '@/components/Admin/CategoryList';
import { supabase, insertRow, updateRow } from '@/lib/supabase';
import type { Category } from '@/types';

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EMPTY_FORM: CategoryFormData = { name: '', slug: '', description: '', sort_order: 0 };

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3_000);
  }, []);

  const fetchCategories = useCallback(async () => {
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
  }, [showMessage]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(EMPTY_FORM);
  }, []);

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, sort_order: categories.length });
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'Category name is required');
      return;
    }
    try {
      if (isCreating) {
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

      {(isCreating || editingId) && (
        <CategoryForm
          formData={formData}
          isCreating={isCreating}
          onChange={setFormData}
          onSave={handleSave}
          onCancel={cancelEdit}
        />
      )}

      <CategoryList categories={categories} onEdit={startEdit} onDelete={handleDelete} />
    </div>
  );
}

export default CategoryManager;

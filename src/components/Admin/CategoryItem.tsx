import { useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import type { Category } from '@/types';

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

interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoryItem({ category, onEdit, onDelete }: CategoryItemProps) {
  const { t } = useLanguage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-elegant hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{category.name}</h4>
          <p className="text-sm text-gray-500 mb-2">/{category.slug}</p>
          {category.description && (
            <p className="text-sm text-gray-600">{category.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{t('admin.categories.order')}: {category.sort_order}</p>
        </div>
        <div className="flex gap-2 ml-4">
          {confirmingDelete ? (
            <>
              <button
                onClick={() => { onDelete(category.id); setConfirmingDelete(false); }}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t('admin.categories.confirmDelete')}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                {t('admin.categories.cancelDelete')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(category)}
                className="p-2 text-gray-400 hover:text-black transition-colors"
                title="Edit"
              >
                <EditIcon />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryItem;

import { useLanguage } from '@/context/LanguageContext';

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface CategoryFormProps {
  formData: CategoryFormData;
  isCreating: boolean;
  onChange: (data: CategoryFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CategoryForm({ formData, isCreating, onChange, onSave, onCancel }: CategoryFormProps) {
  const { t } = useLanguage();

  const handleNameChange = (name: string) => {
    onChange({ ...formData, name, slug: generateSlug(name) });
  };

  return (
    <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-elegant">
      <h3 className="font-medium text-gray-900 mb-4">
        {isCreating ? t('admin.categories.createTitle') : t('admin.categories.editTitle')}
      </h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="category-name" className="block text-sm text-gray-600 mb-2">
            {t('admin.categories.name')}
          </label>
          <input
            id="category-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
            placeholder={t('admin.categories.namePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="category-slug" className="block text-sm text-gray-600 mb-2">
            {t('admin.categories.slug')}
          </label>
          <input
            id="category-slug"
            type="text"
            value={formData.slug}
            onChange={(e) => onChange({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
            placeholder={t('admin.categories.slugPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="category-description" className="block text-sm text-gray-600 mb-2">
            {t('admin.categories.description')}
          </label>
          <textarea
            id="category-description"
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
            placeholder={t('admin.categories.descriptionPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="category-sort-order" className="block text-sm text-gray-600 mb-2">
            {t('admin.categories.sortOrder')}
          </label>
          <input
            id="category-sort-order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => onChange({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
            min="0"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors"
          >
            <SaveIcon />
            {t('admin.categories.save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-elegant hover:bg-gray-300 transition-colors"
          >
            <XIcon />
            {t('admin.categories.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoryForm;

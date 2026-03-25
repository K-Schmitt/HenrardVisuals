import { CategoryItem } from '@/components/Admin/CategoryItem';
import type { Category } from '@/types';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-elegant">
        <p className="text-gray-500 mb-2">No categories yet</p>
        <p className="text-gray-400 text-sm">
          Create your first category to organize your portfolio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default CategoryList;

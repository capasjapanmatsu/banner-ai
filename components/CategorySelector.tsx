import { 
  Catalog, 
  PrimaryCategoryCode,
  getCategoryLabel,
  validateCategorySelection
} from '@banner-ai/catalog-taxonomy';

interface CategorySelectorProps {
  selectedCategories: PrimaryCategoryCode[];
  onCategoryChange: (categories: PrimaryCategoryCode[]) => void;
}

export function CategorySelector({ selectedCategories, onCategoryChange }: CategorySelectorProps) {
  const handleCategoryToggle = (categoryCode: PrimaryCategoryCode) => {
    const isSelected = selectedCategories.includes(categoryCode);
    let newSelection: PrimaryCategoryCode[];

    if (isSelected) {
      newSelection = selectedCategories.filter(code => code !== categoryCode);
    } else {
      // 最大選択数をチェック
      if (selectedCategories.length >= Catalog.allowMultiSelect.max) {
        return; // 最大数に達している場合は追加しない
      }
      newSelection = [...selectedCategories, categoryCode];
    }

    if (validateCategorySelection(newSelection)) {
      onCategoryChange(newSelection);
    }
  };

  return (
    <div className="category-selector">
      <h3 className="text-lg font-semibold mb-4">
        カテゴリを選択してください（最大{Catalog.allowMultiSelect.max}つまで）
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Catalog.primary.map((category) => {
          const isSelected = selectedCategories.includes(category.code);
          const isDisabled = !isSelected && selectedCategories.length >= Catalog.allowMultiSelect.max;
          
          return (
            <button
              key={category.code}
              onClick={() => handleCategoryToggle(category.code)}
              disabled={isDisabled}
              className={`
                p-3 rounded-lg border text-sm font-medium transition-colors
                ${isSelected 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {category.label_ja}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        選択中: {selectedCategories.length}/{Catalog.allowMultiSelect.max}
        {selectedCategories.length > 0 && (
          <div className="mt-2">
            {selectedCategories.map(code => getCategoryLabel(code)).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

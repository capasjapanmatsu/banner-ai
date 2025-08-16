import data from './categories.json' with { type: 'json' };

export type PrimaryCategoryCode = 
  | 'fashion'
  | 'car_parts'
  | 'home_electronics'
  | 'interior'
  | 'food_beverage'
  | 'beauty_health'
  | 'sports_outdoor'
  | 'hobby_entertainment';

export interface CategoryItem {
  code: PrimaryCategoryCode;
  label_ja: string;
}

export interface CatalogData {
  version: string;
  primary: CategoryItem[];
  allowMultiSelect: {
    max: number;
  };
}

export const Catalog = data as CatalogData;

// ヘルパー関数
export const getCategoryByCode = (code: PrimaryCategoryCode): CategoryItem | undefined => {
  return Catalog.primary.find(item => item.code === code);
};

export const getCategoryLabel = (code: PrimaryCategoryCode): string => {
  const category = getCategoryByCode(code);
  return category?.label_ja || code;
};

export const getAllCategoryCodes = (): PrimaryCategoryCode[] => {
  return Catalog.primary.map(item => item.code);
};

export const validateCategorySelection = (codes: PrimaryCategoryCode[]): boolean => {
  return codes.length <= Catalog.allowMultiSelect.max;
};

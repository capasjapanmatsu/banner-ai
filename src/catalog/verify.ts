// カテゴリJSONのスキーマ検証ユーティリティ

interface CategoryItem {
  code: string;
  label_ja: string;
  label_en: string;
  description?: string;
}

interface CatalogData {
  version: string;
  lastUpdated: string;
  primary: CategoryItem[];
  allowMultiSelect: {
    max: number;
    description?: string;
  };
  metadata?: {
    isDefault?: boolean;
    source?: string;
    note?: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  data?: CatalogData;
}

// 必須フィールドの検証
function validateCategoryItem(item: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `primary[${index}]`;

  if (!item || typeof item !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const categoryItem = item as Record<string, unknown>;

  if (!categoryItem.code || typeof categoryItem.code !== 'string') {
    errors.push(`Missing required field in category[${index}]: code`);
  } else if (!/^[a-z_]+$/.test(categoryItem.code)) {
    errors.push(`${prefix}.code: must contain only lowercase letters and underscores`);
  }

  if (!categoryItem.label_ja || typeof categoryItem.label_ja !== 'string') {
    errors.push(`Missing required field in category[${index}]: label_ja`);
  }

  if (!categoryItem.label_en || typeof categoryItem.label_en !== 'string') {
    errors.push(`Missing required field in category[${index}]: label_en`);
  }

  if (categoryItem.description && typeof categoryItem.description !== 'string') {
    errors.push(`${prefix}.description: must be a string if provided`);
  }

  return errors;
}

// メイン検証関数
export function verifyCatalogData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // トップレベル構造の検証
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Data must be a valid object']
    };
  }

  const catalogData = data as Record<string, unknown>;

  // 必須フィールド検証
  if (!catalogData.version || typeof catalogData.version !== 'string') {
    errors.push('Missing required field: version');
  }

  if (!catalogData.lastUpdated || typeof catalogData.lastUpdated !== 'string') {
    errors.push('Missing required field: lastUpdated');
  }

  // プライマリカテゴリ配列検証
  if (!catalogData.primary) {
    errors.push('Missing required field: primary');
  } else if (!Array.isArray(catalogData.primary)) {
    errors.push('primary must be an array');
  } else {
    if (catalogData.primary.length === 0) {
      errors.push('primary array cannot be empty');
    }
    
    if (catalogData.primary.length > 20) {
      warnings.push('primary array has many categories (consider optimization)');
    }

    // 各カテゴリアイテムの検証
    catalogData.primary.forEach((item: unknown, index: number) => {
      errors.push(...validateCategoryItem(item, index));
    });

    // 重複コードチェック
    const codes = catalogData.primary.map((item: unknown) => {
      const categoryItem = item as Record<string, unknown>;
      return categoryItem.code;
    }).filter(Boolean);
    const uniqueCodes = new Set(codes);
    if (codes.length !== uniqueCodes.size) {
      warnings.push('Duplicate category code found in primary array');
    }
  }

  // allowMultiSelect検証
  if (!catalogData.allowMultiSelect) {
    errors.push('Missing required field: allowMultiSelect');
  } else if (typeof catalogData.allowMultiSelect !== 'object') {
    errors.push('allowMultiSelect must be an object');
  } else {
    const allowMultiSelect = catalogData.allowMultiSelect as Record<string, unknown>;
    const { max } = allowMultiSelect;
    
    if (typeof max !== 'number') {
      errors.push('allowMultiSelect.max must be a positive number');
    } else if (max <= 0) {
      errors.push(`allowMultiSelect.max must be a positive number, got: ${max}`);
    } else if (max > 10) {
      warnings.push(`allowMultiSelect.max is unusually large: ${max}`);
    }
  }

  // 検証結果
  const isValid = errors.length === 0;
  
  const result: ValidationResult = {
    isValid,
    errors,
    data: isValid ? (catalogData as unknown as CatalogData) : undefined
  };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

// バージョン比較ヘルパー
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// 安全なJSONパース
export function safeParseCatalogJSON(jsonString: string): ValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return verifyCatalogData(data);
  } catch (error) {
    return {
      isValid: false,
      errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

export type { CatalogData, CategoryItem, ValidationResult };

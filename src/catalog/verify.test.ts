/**
 * カタログデータ検証のユニットテスト
 */

import { verifyCatalogData } from './verify';
import type { CatalogData } from './verify';

describe('Catalog Verification', () => {
  // 正常なカタログデータのテンプレート
  const validCatalogData: CatalogData = {
    version: '1.0.0',
    lastUpdated: '2024-12-19',
    primary: [
      {
        code: 'fashion',
        label_ja: 'ファッション',
        label_en: 'Fashion',
        description: '衣類・アクセサリー・バッグなど'
      }
    ],
    allowMultiSelect: {
      max: 3,
      description: '追加カテゴリの最大選択数'
    }
  };

  describe('正常系テスト', () => {
    test('正しいcategories.jsonを通す', () => {
      const result = verifyCatalogData(validCatalogData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validCatalogData);
    });

    test('追加フィールドがあっても正常処理', () => {
      const dataWithExtraFields = {
        ...validCatalogData,
        metadata: {
          source: 'test',
          buildTime: '2024-12-19T10:00:00Z'
        }
      };

      const result = verifyCatalogData(dataWithExtraFields);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('複数カテゴリの正常処理', () => {
      const dataWithMultipleCategories = {
        ...validCatalogData,
        primary: [
          ...validCatalogData.primary,
          {
            code: 'electronics',
            label_ja: '家電',
            label_en: 'Electronics',
            description: '家電製品・電子機器'
          }
        ]
      };

      const result = verifyCatalogData(dataWithMultipleCategories);
      
      expect(result.isValid).toBe(true);
      expect(result.data?.primary).toHaveLength(2);
    });
  });

  describe('異常系テスト - 必須キー欠落', () => {
    test('version欠落でエラー', () => {
      const dataWithoutVersion = { ...validCatalogData };
      delete (dataWithoutVersion as any).version;

      const result = verifyCatalogData(dataWithoutVersion);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: version');
    });

    test('primary欠落でエラー', () => {
      const dataWithoutPrimary = { ...validCatalogData };
      delete (dataWithoutPrimary as any).primary;

      const result = verifyCatalogData(dataWithoutPrimary);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: primary');
    });

    test('allowMultiSelect欠落でエラー', () => {
      const dataWithoutAllowMultiSelect = { ...validCatalogData };
      delete (dataWithoutAllowMultiSelect as any).allowMultiSelect;

      const result = verifyCatalogData(dataWithoutAllowMultiSelect);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: allowMultiSelect');
    });

    test('カテゴリの必須フィールド欠落でエラー', () => {
      const dataWithInvalidCategory = {
        ...validCatalogData,
        primary: [
          {
            // code が欠落
            label_ja: 'テストカテゴリ',
            label_en: 'Test Category',
            description: 'テスト用'
          }
        ]
      };

      const result = verifyCatalogData(dataWithInvalidCategory);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing required field in category'))).toBe(true);
    });
  });

  describe('異常系テスト - allowMultiSelect.max 不正', () => {
    test('maxが数値でない場合はエラー', () => {
      const dataWithInvalidMax = {
        ...validCatalogData,
        allowMultiSelect: {
          max: 'invalid' as any,
          description: 'テスト'
        }
      };

      const result = verifyCatalogData(dataWithInvalidMax);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('allowMultiSelect.max must be a positive number'))).toBe(true);
    });

    test('maxが負数の場合はエラー', () => {
      const dataWithNegativeMax = {
        ...validCatalogData,
        allowMultiSelect: {
          max: -1,
          description: 'テスト'
        }
      };

      const result = verifyCatalogData(dataWithNegativeMax);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('allowMultiSelect.max must be a positive number, got: -1');
    });

    test('maxが0の場合はエラー', () => {
      const dataWithZeroMax = {
        ...validCatalogData,
        allowMultiSelect: {
          max: 0,
          description: 'テスト'
        }
      };

      const result = verifyCatalogData(dataWithZeroMax);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('allowMultiSelect.max must be a positive number, got: 0');
    });

    test('maxが上限値を超える場合は警告', () => {
      const dataWithTooLargeMax = {
        ...validCatalogData,
        allowMultiSelect: {
          max: 100,
          description: 'テスト'
        }
      };

      const result = verifyCatalogData(dataWithTooLargeMax);
      
      // 上限値超過は警告レベル（validationは通す）
      expect(result.isValid).toBe(true);
      expect(result.warnings?.some(warning => warning.includes('allowMultiSelect.max is unusually large'))).toBe(true);
    });
  });

  describe('異常系テスト - データ型エラー', () => {
    test('primaryが配列でない場合はエラー', () => {
      const dataWithInvalidPrimary = {
        ...validCatalogData,
        primary: 'invalid' as any
      };

      const result = verifyCatalogData(dataWithInvalidPrimary);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('primary must be an array');
    });

    test('空のprimary配列はエラー', () => {
      const dataWithEmptyPrimary = {
        ...validCatalogData,
        primary: []
      };

      const result = verifyCatalogData(dataWithEmptyPrimary);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('primary array cannot be empty');
    });

    test('nullデータはエラー', () => {
      const result = verifyCatalogData(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data must be a valid object');
    });

    test('undefinedデータはエラー', () => {
      const result = verifyCatalogData(undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data must be a valid object');
    });
  });

  describe('エッジケーステスト', () => {
    test('重複するカテゴリコードは警告', () => {
      const dataWithDuplicateCodes = {
        ...validCatalogData,
        primary: [
          {
            code: 'fashion',
            label_ja: 'ファッション1',
            label_en: 'Fashion 1',
            description: 'テスト1'
          },
          {
            code: 'fashion', // 重複
            label_ja: 'ファッション2', 
            label_en: 'Fashion 2',
            description: 'テスト2'
          }
        ]
      };

      const result = verifyCatalogData(dataWithDuplicateCodes);
      
      expect(result.isValid).toBe(true); // 重複は警告レベル
      expect(result.warnings?.some(warning => warning.includes('Duplicate category code'))).toBe(true);
    });

    test('バージョン比較テスト', () => {
      const olderVersion = { ...validCatalogData, version: '0.9.0' };
      const newerVersion = { ...validCatalogData, version: '2.0.0' };
      
      const olderResult = verifyCatalogData(olderVersion);
      const newerResult = verifyCatalogData(newerVersion);
      
      expect(olderResult.isValid).toBe(true);
      expect(newerResult.isValid).toBe(true);
    });
  });
});

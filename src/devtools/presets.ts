/**
 * プリセット開発者ツール
 * スナップショット保存・復元・差分計算機能
 */

import { type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';
import { type CategoryPreset } from '@/lib/categoryPresets';

// スナップショットデータの型定義
export interface PresetSnapshot {
  id: string;
  category: PrimaryCategoryCode;
  presets: CategoryPreset;
  captured_at: string;
  metadata?: {
    userAgent?: string;
    buildVersion?: string;
    notes?: string;
  };
}

// 差分データの型定義
export interface PresetDifference {
  path: string;
  current: unknown;
  new: unknown;
  type: 'added' | 'changed' | 'removed';
}

// LocalStorage キー
const SNAPSHOTS_STORAGE_KEY = 'preset-snapshots';
const MAX_SNAPSHOTS = 20; // 最大保存数

/**
 * プリセット開発者ツールのメイン機能
 */
export const presetDevtools = {
  /**
   * スナップショットを保存
   */
  saveSnapshot: (
    category: PrimaryCategoryCode,
    presets: CategoryPreset,
    notes?: string
  ): PresetSnapshot => {
    const snapshot: PresetSnapshot = {
      id: generateSnapshotId(),
      category,
      presets: JSON.parse(JSON.stringify(presets)), // ディープコピー
      captured_at: new Date().toISOString(),
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
        buildVersion: process.env.NODE_ENV || 'development',
        notes,
      },
    };

    // 既存のスナップショット一覧を取得
    const existing = presetDevtools.getSnapshots();
    
    // 新しいスナップショットを先頭に追加
    const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    
    // LocalStorageに保存
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('スナップショット保存エラー:', error);
      throw new Error('スナップショットの保存に失敗しました');
    }

    return snapshot;
  },

  /**
   * 全スナップショットを取得
   */
  getSnapshots: (): PresetSnapshot[] => {
    try {
      const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('スナップショット読み込みエラー:', error);
      return [];
    }
  },

  /**
   * 特定のスナップショットを取得
   */
  getSnapshot: (id: string): PresetSnapshot | null => {
    const snapshots = presetDevtools.getSnapshots();
    return snapshots.find(snapshot => snapshot.id === id) || null;
  },

  /**
   * スナップショットを削除
   */
  deleteSnapshot: (id: string): boolean => {
    try {
      const existing = presetDevtools.getSnapshots();
      const filtered = existing.filter(snapshot => snapshot.id !== id);
      
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('スナップショット削除エラー:', error);
      return false;
    }
  },

  /**
   * 全スナップショットをクリア
   */
  clearSnapshots: (): boolean => {
    try {
      localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('スナップショットクリアエラー:', error);
      return false;
    }
  },

  /**
   * 2つのプリセット間の差分を計算
   */
  calculateDifferences: (
    oldPreset: CategoryPreset,
    newPreset: CategoryPreset
  ): PresetDifference[] => {
    const differences: PresetDifference[] = [];

    // 基本情報の比較
    if (oldPreset.name !== newPreset.name) {
      differences.push({
        path: 'name',
        current: oldPreset.name,
        new: newPreset.name,
        type: 'changed',
      });
    }

    if (oldPreset.description !== newPreset.description) {
      differences.push({
        path: 'description',
        current: oldPreset.description,
        new: newPreset.description,
        type: 'changed',
      });
    }

    // AI設定の詳細比較
    const aiSettingsDiffs = compareAiSettings(oldPreset.aiSettings, newPreset.aiSettings);
    differences.push(...aiSettingsDiffs);

    // 推奨サイズの比較
    const sizesDiffs = compareRecommendedSizes(oldPreset.recommendedSizes, newPreset.recommendedSizes);
    differences.push(...sizesDiffs);

    return differences;
  },

  /**
   * JSON形式でスナップショットをエクスポート
   */
  exportSnapshots: (): string => {
    const snapshots = presetDevtools.getSnapshots();
    return JSON.stringify(snapshots, null, 2);
  },

  /**
   * JSON形式からスナップショットをインポート
   */
  importSnapshots: (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected array');
      }

      // 基本的なバリデーション
      for (const item of parsed) {
        if (!item.id || !item.category || !item.presets || !item.captured_at) {
          throw new Error('Invalid snapshot format');
        }
      }

      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(parsed));
      return true;
    } catch (error) {
      console.error('スナップショットインポートエラー:', error);
      return false;
    }
  },

  /**
   * 統計情報を取得
   */
  getStatistics: () => {
    const snapshots = presetDevtools.getSnapshots();
    const categories = new Set(snapshots.map(s => s.category));
    
    return {
      totalSnapshots: snapshots.length,
      uniqueCategories: categories.size,
      oldestSnapshot: snapshots[snapshots.length - 1]?.captured_at,
      newestSnapshot: snapshots[0]?.captured_at,
      categoryCounts: Array.from(categories).map(category => ({
        category,
        count: snapshots.filter(s => s.category === category).length,
      })),
    };
  },
};

/**
 * スナップショットIDを生成
 */
function generateSnapshotId(): string {
  return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AI設定の差分を比較
 */
function compareAiSettings(oldSettings: CategoryPreset['aiSettings'], newSettings: CategoryPreset['aiSettings']): PresetDifference[] {
  const differences: PresetDifference[] = [];

  // 背景削除設定
  if (oldSettings.backgroundRemoval.enabled !== newSettings.backgroundRemoval.enabled) {
    differences.push({
      path: 'aiSettings.backgroundRemoval.enabled',
      current: oldSettings.backgroundRemoval.enabled,
      new: newSettings.backgroundRemoval.enabled,
      type: 'changed',
    });
  }

  if (oldSettings.backgroundRemoval.strength !== newSettings.backgroundRemoval.strength) {
    differences.push({
      path: 'aiSettings.backgroundRemoval.strength',
      current: oldSettings.backgroundRemoval.strength,
      new: newSettings.backgroundRemoval.strength,
      type: 'changed',
    });
  }

  // 画像補正設定
  const enhancementFields = ['enabled', 'wrinkleReduction', 'colorBalance', 'sharpening'] as const;
  for (const field of enhancementFields) {
    if (oldSettings.imageEnhancement[field] !== newSettings.imageEnhancement[field]) {
      differences.push({
        path: `aiSettings.imageEnhancement.${field}`,
        current: oldSettings.imageEnhancement[field],
        new: newSettings.imageEnhancement[field],
        type: 'changed',
      });
    }
  }

  // バナーデザイン設定
  const designFields = ['colorScheme', 'layout', 'typography'] as const;
  for (const field of designFields) {
    if (oldSettings.bannerDesign[field] !== newSettings.bannerDesign[field]) {
      differences.push({
        path: `aiSettings.bannerDesign.${field}`,
        current: oldSettings.bannerDesign[field],
        new: newSettings.bannerDesign[field],
        type: 'changed',
      });
    }
  }

  // 特殊機能の比較
  const oldFeatures = oldSettings.specialFeatures;
  const newFeatures = newSettings.specialFeatures;
  
  const allFeatureKeys = new Set([
    ...Object.keys(oldFeatures),
    ...Object.keys(newFeatures),
  ]);

  for (const key of allFeatureKeys) {
    const oldValue = oldFeatures[key as keyof typeof oldFeatures];
    const newValue = newFeatures[key as keyof typeof newFeatures];

    if (oldValue !== newValue) {
      differences.push({
        path: `aiSettings.specialFeatures.${key}`,
        current: oldValue,
        new: newValue,
        type: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'changed',
      });
    }
  }

  return differences;
}

/**
 * 推奨サイズの差分を比較
 */
function compareRecommendedSizes(
  oldSizes: CategoryPreset['recommendedSizes'],
  newSizes: CategoryPreset['recommendedSizes']
): PresetDifference[] {
  const differences: PresetDifference[] = [];

  if (oldSizes.length !== newSizes.length) {
    differences.push({
      path: 'recommendedSizes.length',
      current: oldSizes.length,
      new: newSizes.length,
      type: 'changed',
    });
  }

  // 各サイズの詳細比較（簡略版）
  const maxLength = Math.max(oldSizes.length, newSizes.length);
  for (let i = 0; i < maxLength; i++) {
    const oldSize = oldSizes[i];
    const newSize = newSizes[i];

    if (!oldSize && newSize) {
      differences.push({
        path: `recommendedSizes[${i}]`,
        current: undefined,
        new: newSize,
        type: 'added',
      });
    } else if (oldSize && !newSize) {
      differences.push({
        path: `recommendedSizes[${i}]`,
        current: oldSize,
        new: undefined,
        type: 'removed',
      });
    } else if (oldSize && newSize) {
      if (oldSize.width !== newSize.width || oldSize.height !== newSize.height || oldSize.name !== newSize.name) {
        differences.push({
          path: `recommendedSizes[${i}]`,
          current: oldSize,
          new: newSize,
          type: 'changed',
        });
      }
    }
  }

  return differences;
}

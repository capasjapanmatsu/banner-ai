'use client';

import { useState, useEffect } from 'react';
import { type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';
import { categoryPresets, getCategoryPreset, type CategoryPreset } from '@/lib/categoryPresets';
import { Catalog } from '@/src/catalog';
import { analytics } from '@/lib/analytics';
import { canAccessDeveloperPages } from '@/lib/featureFlags';
import { presetDevtools, type PresetSnapshot } from '../../../src/devtools/presets';

interface PresetDifference {
  path: string;
  current: unknown;
  new: unknown;
  type: 'added' | 'changed' | 'removed';
}

export default function PresetDevelopmentPage() {
  const [selectedCategory, setSelectedCategory] = useState<PrimaryCategoryCode>('fashion');
  const [currentPreset, setCurrentPreset] = useState<CategoryPreset | null>(null);
  const [snapshots, setSnapshots] = useState<PresetSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [differences, setDifferences] = useState<PresetDifference[]>([]);
  const [showDifferences, setShowDifferences] = useState(false);

  // Feature Flag チェック後の早期リターン
  const hasAccess = canAccessDeveloperPages();

  useEffect(() => {
    if (!hasAccess) return;
    
    // カタログ初期化
    if (Catalog) {
      Catalog.initialize();
    }
    // スナップショット履歴読み込み
    loadSnapshots();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    
    // カテゴリ変更時にプリセットを更新
    updateCurrentPreset();
    // 開発者ページ表示トラッキング
    analytics.trackPresetPreviewOpened(selectedCategory, 'dev_page');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, hasAccess]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス不可</h1>
          <p className="text-gray-600">この機能は現在の環境では利用できません。</p>
        </div>
      </div>
    );
  }

  const loadSnapshots = () => {
    const saved = presetDevtools.getSnapshots();
    setSnapshots(saved);
  };

  const updateCurrentPreset = () => {
    const preset = getCategoryPreset(selectedCategory);
    setCurrentPreset(preset);
    
    // 前回のスナップショットとの差分計算
    const lastSnapshot = snapshots[0];
    if (lastSnapshot) {
      const diffs = presetDevtools.calculateDifferences(lastSnapshot.presets, preset);
      setDifferences(diffs);
    }
  };

  const handleCategoryChange = (category: PrimaryCategoryCode) => {
    setSelectedCategory(category);
  };

  const handleApplyPreset = async () => {
    if (!currentPreset) return;

    setLoading(true);
    try {
      // プリセット適用シミュレーション
      await new Promise(resolve => setTimeout(resolve, 500));
      
      analytics.trackPresetApplied(selectedCategory, currentPreset.name, 'dev_page');
      
      // ターミナルログ出力
      console.log('🎯 プリセット適用イベント:', {
        category: selectedCategory,
        preset_name: currentPreset.name,
        timestamp: new Date().toISOString(),
        source: 'dev_page'
      });
      
      alert(`プリセット「${currentPreset.name}」を適用しました`);
      
    } catch (error) {
      console.error('プリセット適用エラー:', error);
      alert('プリセット適用に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    const defaultPreset = getCategoryPreset('fashion');
    setCurrentPreset(defaultPreset);
    alert('デフォルト設定に戻しました');
  };

  const handleSaveSnapshot = () => {
    if (!currentPreset) return;

    const snapshot = presetDevtools.saveSnapshot(selectedCategory, currentPreset);
    setSnapshots(prev => [snapshot, ...prev]);
    
    analytics.trackPresetSnapshotSaved(selectedCategory, snapshot.id);
    
    // ターミナルログ出力
    console.log('📸 スナップショット保存イベント:', {
      category: selectedCategory,
      snapshot_id: snapshot.id,
      timestamp: new Date().toISOString()
    });
    
    alert('スナップショットを保存しました');
  };

  const handleRestoreSnapshot = (snapshot: PresetSnapshot) => {
    setCurrentPreset(snapshot.presets);
    setSelectedCategory(snapshot.category);
    
    analytics.trackPresetSnapshotRestored(snapshot.category, snapshot.id);
    
    // ターミナルログ出力
    console.log('🔄 スナップショット復元イベント:', {
      category: snapshot.category,
      snapshot_id: snapshot.id,
      timestamp: new Date().toISOString()
    });
    
    alert(`スナップショット「${new Date(snapshot.captured_at).toLocaleString()}」を復元しました`);
  };

  const toggleDifferences = () => {
    setShowDifferences(!showDifferences);
  };

  if (!Catalog.primary) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">プリセット検証ページ</h1>
            <p className="text-gray-600">カタログを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">プリセット検証ページ</h1>
          <p className="text-gray-600">カテゴリ別のプリセット設定を確認・テストできます（開発者向け）</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左パネル: カテゴリ選択 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">カテゴリ選択</h2>
            
            <div className="space-y-3">
              {Catalog.primary.map((category) => (
                <button
                  key={category.code}
                  onClick={() => handleCategoryChange(category.code as PrimaryCategoryCode)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedCategory === category.code
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{category.label_ja}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {categoryPresets[category.code as PrimaryCategoryCode]?.description || '設定なし'}
                  </div>
                </button>
              ))}
            </div>

            {/* アクションボタン */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleApplyPreset}
                disabled={loading || !currentPreset}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '適用中...' : 'プリセットを適用'}
              </button>
              
              <button
                onClick={handleResetToDefault}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                デフォルトに戻す
              </button>
              
              <button
                onClick={handleSaveSnapshot}
                disabled={!currentPreset}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                スナップショット保存
              </button>
            </div>
          </div>

          {/* 右パネル: プリセット詳細 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">プリセット詳細</h2>
              {differences.length > 0 && (
                <button
                  onClick={toggleDifferences}
                  className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full hover:bg-orange-200"
                >
                  差分 ({differences.length})
                </button>
              )}
            </div>

            {currentPreset ? (
              <div className="space-y-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">基本情報</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">名前:</span>
                        <span className="ml-2 text-gray-600">{currentPreset.name}</span>
                      </div>
                      <div>
                        <span className="font-medium">カテゴリ:</span>
                        <span className="ml-2 text-gray-600">{currentPreset.category}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium">説明:</span>
                      <span className="ml-2 text-gray-600">{currentPreset.description}</span>
                    </div>
                  </div>
                </div>

                {/* AI設定テーブル */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">AI設定</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">設定項目</th>
                          <th className="px-4 py-2 text-left font-medium">値</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2 font-medium">背景削除</td>
                          <td className="px-4 py-2">
                            {currentPreset.aiSettings.backgroundRemoval.enabled ? 
                              `有効 (${currentPreset.aiSettings.backgroundRemoval.strength})` : 
                              '無効'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">しわ軽減</td>
                          <td className="px-4 py-2">
                            {currentPreset.aiSettings.imageEnhancement.wrinkleReduction ? '有効' : '無効'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">カラーバランス</td>
                          <td className="px-4 py-2">
                            {currentPreset.aiSettings.imageEnhancement.colorBalance ? '有効' : '無効'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">配色スキーム</td>
                          <td className="px-4 py-2">{currentPreset.aiSettings.bannerDesign.colorScheme}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">レイアウト</td>
                          <td className="px-4 py-2">{currentPreset.aiSettings.bannerDesign.layout}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">タイポグラフィ</td>
                          <td className="px-4 py-2">{currentPreset.aiSettings.bannerDesign.typography}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 特殊機能 */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">特殊機能</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(currentPreset.aiSettings.specialFeatures).map(([key, enabled]) => (
                        <span
                          key={key}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {key}: {enabled ? '有効' : '無効'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 差分表示 */}
                {showDifferences && differences.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">前回との差分</h3>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      {differences.map((diff, index) => (
                        <div key={index} className="text-sm mb-2">
                          <span className={`font-medium ${
                            diff.type === 'added' ? 'text-green-600' :
                            diff.type === 'changed' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            [{diff.type}]
                          </span>
                          <span className="ml-2">{diff.path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">カテゴリを選択してください</p>
            )}
          </div>
        </div>

        {/* スナップショット履歴 */}
        {snapshots.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">スナップショット履歴</h2>
            <div className="space-y-3">
              {snapshots.slice(0, 5).map((snapshot, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{snapshot.presets.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(snapshot.captured_at).toLocaleString()} | カテゴリ: {snapshot.category}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreSnapshot(snapshot)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    復元
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

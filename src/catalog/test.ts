/**
 * CDNカタログシステムのテスト/デモ用コード
 * STEP 11実装完了確認用
 */

import { Catalog, loadCatalog } from './index';

// 基本的な使用例
export async function testCatalogSystem() {
  console.log('🚀 CDNカタログシステムテスト開始');

  try {
    // 1. 従来のCatalogオブジェクト使用パターン
    console.log('📦 プライマリカテゴリ数:', Catalog.primary.length);
    console.log('🏷️ 最初のカテゴリ:', Catalog.primary[0]);
    console.log('📋 バージョン:', Catalog.version);

    // 2. 動的読み込みパターン
    console.log('⬇️ CDNからカタログ読み込み中...');
    const catalogData = await loadCatalog();
    console.log('✅ 読み込み完了:', {
      version: catalogData.version,
      primaryCount: catalogData.primary.length,
      lastUpdated: new Date().toISOString()
    });

    // 3. キャッシュ確認
    console.log('🗄️ LocalStorage確認:', {
      hasCache: localStorage.getItem('catalog-cache') !== null,
      hasETag: localStorage.getItem('catalog-etag') !== null
    });

    // 4. リフレッシュテスト
    console.log('🔄 カタログリフレッシュ...');
    await Catalog.refresh();
    console.log('✅ リフレッシュ完了');

    return true;
  } catch (error) {
    console.error('❌ テストエラー:', error);
    return false;
  }
}

// React環境でのテスト例
export function testReactIntegration() {
  if (typeof window === 'undefined') {
    console.log('⚠️ サーバーサイド環境: React フックはスキップ');
    return;
  }

  console.log('⚛️ React環境での使用例:');
  console.log(`
import { useCatalog } from './src/catalog';

function MyComponent() {
  const { catalog, loading, error } = useCatalog();
  
  if (loading) return <div>Loading catalog...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!catalog) return <div>No catalog available</div>;
  
  return (
    <div>
      <h2>カタログ v{catalog.version}</h2>
      {catalog.primary.map((category) => (
        <div key={category.id}>{category.name}</div>
      ))}
    </div>
  );
}
  `);
}

// オフライン動作のシミュレーション
export async function testOfflineBehavior() {
  console.log('📱 オフライン動作テスト');
  
  // ネットワークエラーをシミュレート
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('Network unavailable'));

  try {
    const catalog = await loadCatalog();
    console.log('✅ オフライン時もフォールバック動作:', catalog ? 'データ利用可能' : 'データなし');
  } catch (error) {
    console.log('⚠️ フォールバック失敗:', error instanceof Error ? error.message : String(error));
  } finally {
    // fetchを復元
    globalThis.fetch = originalFetch;
  }
}

// 既存コードとの互換性を保つためのアダプター

import { fetchCatalog, type CatalogData } from './fetchCatalog';
import { type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';

// グローバルキャッシュ（メモリ）
let cachedCatalog: CatalogData | null = null;
let lastFetchTime = 0;
const MEMORY_CACHE_DURATION = 60 * 1000; // 1分

// カタログの非同期取得
async function loadCatalog(): Promise<CatalogData> {
  // メモリキャッシュチェック
  if (cachedCatalog && (Date.now() - lastFetchTime) < MEMORY_CACHE_DURATION) {
    return cachedCatalog;
  }

  try {
    const result = await fetchCatalog({ timeout: 5000 });
    cachedCatalog = result.data;
    lastFetchTime = Date.now();
    
    if (result.source !== 'cdn') {
      console.warn(`📦 Catalog loaded from ${result.source}:`, {
        version: result.version,
        isFresh: result.isFresh,
        error: result.error
      });
    }
    
    return result.data;
  } catch (error) {
    console.error('Failed to load catalog:', error);
    
    // 最終フォールバック：ハードコードされたカテゴリ
    return {
      version: '1.0.0-emergency',
      lastUpdated: new Date().toISOString(),
      primary: [
        { code: 'general', label_ja: '一般', label_en: 'General' }
      ],
      allowMultiSelect: { max: 1 },
      metadata: { isDefault: true, source: 'emergency' }
    };
  }
}

// 既存のCatalogオブジェクトとの互換性
export const Catalog = {
  // 主要カテゴリ配列（動的読み込み）
  get primary() {
    if (!cachedCatalog) {
      // 同期的にアクセスされた場合のフォールバック
      console.warn('Catalog accessed synchronously before loading');
      return [
        { code: 'loading', label_ja: '読み込み中...', label_en: 'Loading...' }
      ];
    }
    return cachedCatalog.primary;
  },

  // マルチセレクト設定
  get allowMultiSelect() {
    return cachedCatalog?.allowMultiSelect || { max: 3 };
  },

  // バージョン情報
  get version() {
    return cachedCatalog?.version || 'unknown';
  },

  // 初期化関数
  async initialize(): Promise<void> {
    await loadCatalog();
  },

  // 強制リフレッシュ
  async refresh(): Promise<void> {
    cachedCatalog = null;
    lastFetchTime = 0;
    await loadCatalog();
  }
};

// カテゴリラベル取得（既存関数との互換）
export function getCategoryLabel(code: PrimaryCategoryCode | string): string {
  if (!cachedCatalog) {
    return code; // フォールバック
  }

  const category = cachedCatalog.primary.find(cat => cat.code === code);
  return category?.label_ja || code;
}

// Reactフック：カタログの動的読み込み（Reactがある場合のみ）
export function useCatalog() {
  // React環境チェック
  if (typeof window === 'undefined' || !React) {
    throw new Error('useCatalog hook requires React environment');
  }

  const [catalog, setCatalog] = React.useState<CatalogData | null>(cachedCatalog);
  const [loading, setLoading] = React.useState(!cachedCatalog);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadCatalog();
        if (mounted) {
          setCatalog(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load catalog');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { catalog, loading, error, refresh: () => Catalog.refresh() };
}

// React モジュールの動的インポート
let React: typeof import('react') | undefined;
if (typeof window !== 'undefined') {
  try {
    // 動的インポートでReactを取得
    import('react').then(reactModule => {
      React = reactModule;
    }).catch(() => {
      // React がない環境では何もしない
    });
  } catch {
    // インポートに失敗した場合は何もしない
  }
}

export { loadCatalog, type CatalogData };

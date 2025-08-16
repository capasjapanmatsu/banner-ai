// カテゴリデータのCDN取得・キャッシュ・フェイルセーフシステム

import { verifyCatalogData, type CatalogData } from './verify';
import defaultCategories from './default.categories.json';

// キャッシュキー
const CACHE_KEY = 'catalog:categories';
const ETAG_KEY = 'catalog:etag';
const VERSION_KEY = 'catalog:version';
const LAST_FETCH_KEY = 'catalog:lastFetch';

// 設定
const CDN_URL = process.env.NEXT_PUBLIC_CATALOG_CDN_URL || 'https://cdn.example.com/categories.json';
const CACHE_DURATION = 5 * 60 * 1000; // 5分
const STALE_WHILE_REVALIDATE_TIME = 30 * 60 * 1000; // 30分

interface FetchResult {
  data: CatalogData;
  source: 'cdn' | 'cache' | 'default';
  version: string;
  isFresh: boolean;
  error?: string;
}

// ストレージヘルパー（localStorage + エラーハンドリング）
class SafeStorage {
  static get(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  static set(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  static remove(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}

// キャッシュ管理
class CatalogCache {
  // キャッシュからデータ取得
  static getCached(): CatalogData | null {
    const cached = SafeStorage.get(CACHE_KEY);
    if (!cached) return null;

    try {
      const validation = verifyCatalogData(JSON.parse(cached));
      return validation.isValid ? validation.data! : null;
    } catch {
      return null;
    }
  }

  // キャッシュにデータ保存
  static setCached(data: CatalogData, etag?: string): boolean {
    const success = SafeStorage.set(CACHE_KEY, JSON.stringify(data));
    if (success) {
      SafeStorage.set(VERSION_KEY, data.version);
      SafeStorage.set(LAST_FETCH_KEY, Date.now().toString());
      if (etag) {
        SafeStorage.set(ETAG_KEY, etag);
      }
    }
    return success;
  }

  // キャッシュの新鮮度チェック
  static isCacheFresh(): boolean {
    const lastFetch = SafeStorage.get(LAST_FETCH_KEY);
    if (!lastFetch) return false;

    const elapsed = Date.now() - parseInt(lastFetch, 10);
    return elapsed < CACHE_DURATION;
  }

  // stale-while-revalidate チェック
  static isCacheStale(): boolean {
    const lastFetch = SafeStorage.get(LAST_FETCH_KEY);
    if (!lastFetch) return true;

    const elapsed = Date.now() - parseInt(lastFetch, 10);
    return elapsed > STALE_WHILE_REVALIDATE_TIME;
  }

  // ETag取得
  static getEtag(): string | null {
    return SafeStorage.get(ETAG_KEY);
  }

  // キャッシュクリア
  static clear(): void {
    SafeStorage.remove(CACHE_KEY);
    SafeStorage.remove(ETAG_KEY);
    SafeStorage.remove(VERSION_KEY);
    SafeStorage.remove(LAST_FETCH_KEY);
  }
}

// CDNからの取得
async function fetchFromCDN(signal?: AbortSignal): Promise<{ data?: CatalogData; etag?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };

    // ETag があれば If-None-Match ヘッダーを追加
    const etag = CatalogCache.getEtag();
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const response = await fetch(CDN_URL, {
      headers,
      signal,
      mode: 'cors'
    });

    // 304 Not Modified
    if (response.status === 304) {
      const cached = CatalogCache.getCached();
      if (cached) {
        // キャッシュの最終取得時刻を更新
        CatalogCache.setCached(cached, etag || undefined);
        return { data: cached };
      }
    }

    // 2xx 成功
    if (response.ok) {
      const jsonText = await response.text();
      const validation = verifyCatalogData(JSON.parse(jsonText));
      
      if (validation.isValid && validation.data) {
        const newEtag = response.headers.get('etag');
        CatalogCache.setCached(validation.data, newEtag || undefined);
        return { data: validation.data, etag: newEtag || undefined };
      } else {
        console.warn('CDN returned invalid catalog data:', validation.errors);
        return { error: 'Invalid data format from CDN' };
      }
    }

    return { error: `HTTP ${response.status}: ${response.statusText}` };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: 'Request timeout' };
    }
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// デフォルトカテゴリの取得
function getDefaultCatalog(): CatalogData {
  const validation = verifyCatalogData(defaultCategories);
  if (validation.isValid && validation.data) {
    return validation.data;
  }
  
  // 最終フォールバック（ハードコード）
  return {
    version: '1.0.0-fallback',
    lastUpdated: new Date().toISOString(),
    primary: [
      {
        code: 'general',
        label_ja: '一般',
        label_en: 'General',
        description: 'フォールバックカテゴリ'
      }
    ],
    allowMultiSelect: {
      max: 1,
      description: 'フォールバック設定'
    },
    metadata: {
      isDefault: true,
      source: 'hardcoded-fallback',
      note: 'Emergency fallback when all other sources fail'
    }
  };
}

// メイン取得関数：stale-while-revalidate パターン
export async function fetchCatalog(options: {
  timeout?: number;
  forceRefresh?: boolean;
} = {}): Promise<FetchResult> {
  const { timeout = 10000, forceRefresh = false } = options;

  // 1. 強制リフレッシュでない場合、新鮮なキャッシュがあれば即座に返す
  if (!forceRefresh && CatalogCache.isCacheFresh()) {
    const cached = CatalogCache.getCached();
    if (cached) {
      console.log('📦 Serving fresh cached catalog:', cached.version);
      return {
        data: cached,
        source: 'cache',
        version: cached.version,
        isFresh: true
      };
    }
  }

  // 2. 古いキャッシュがある場合、バックグラウンドで更新しつつ古いデータを返す
  const staleCache = CatalogCache.getCached();
  const isStale = CatalogCache.isCacheStale();

  // 3. CDNから取得試行
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const cdnResult = await fetchFromCDN(controller.signal);
    clearTimeout(timeoutId);

    if (cdnResult.data) {
      console.log('🌐 Fetched from CDN:', cdnResult.data.version);
      return {
        data: cdnResult.data,
        source: 'cdn',
        version: cdnResult.data.version,
        isFresh: true
      };
    }

    // CDN失敗時の処理
    console.warn('CDN fetch failed:', cdnResult.error);

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('CDN fetch error:', error);
  }

  // 4. CDN失敗 → キャッシュフォールバック
  if (staleCache && !isStale) {
    console.log('📦 Fallback to stale cache:', staleCache.version);
    return {
      data: staleCache,
      source: 'cache',
      version: staleCache.version,
      isFresh: false,
      error: 'CDN unavailable, using cached data'
    };
  }

  // 5. 最終フォールバック → デフォルトカテゴリ
  const defaultData = getDefaultCatalog();
  console.log('🔒 Fallback to default catalog:', defaultData.version);
  return {
    data: defaultData,
    source: 'default',
    version: defaultData.version,
    isFresh: false,
    error: 'All sources failed, using built-in default'
  };
}

// キャッシュクリア（デバッグ用）
export function clearCatalogCache(): void {
  CatalogCache.clear();
  console.log('🗑️ Catalog cache cleared');
}

// キャッシュ状態の取得（デバッグ用）
export function getCatalogCacheInfo(): {
  hasCache: boolean;
  version?: string;
  lastFetch?: string;
  isFresh: boolean;
  etag?: string;
} {
  const cached = CatalogCache.getCached();
  const lastFetch = SafeStorage.get(LAST_FETCH_KEY);
  
  return {
    hasCache: !!cached,
    version: cached?.version,
    lastFetch: lastFetch ? new Date(parseInt(lastFetch, 10)).toISOString() : undefined,
    isFresh: CatalogCache.isCacheFresh(),
    etag: CatalogCache.getEtag() || undefined
  };
}

export type { FetchResult, CatalogData };

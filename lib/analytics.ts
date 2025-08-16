import { supabase } from './supabase/client';
import type { EventType, EventData, UserEvent } from '../types/analytics';

// セッションIDの生成・管理
let sessionId: string | null = null;

export function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId || 'server_session';
}

export function getSessionId(): string {
  if (typeof window !== 'undefined' && !sessionId) {
    sessionId = sessionStorage.getItem('analytics_session_id') || generateSessionId();
  }
  return sessionId || 'server_session';
}

// プライマリカテゴリの取得（ユーザープロファイルから）
async function getUserPrimaryCategory(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_category')
      .eq('user_id', user.id)
      .single();

    return profile?.primary_category || null;
  } catch (error) {
    console.warn('プライマリカテゴリの取得に失敗:', error);
    return null;
  }
}

// イベント送信の核心機能
export async function trackEvent(
  eventType: EventType, 
  eventData: EventData,
  options?: {
    primaryCategory?: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<boolean> {
  try {
    // ユーザー認証状態の確認
    const { data: { user } } = await supabase.auth.getUser();
    const userId = options?.userId || user?.id;
    
    if (!userId) {
      console.warn('未認証ユーザーのイベントトラッキングをスキップ:', eventType);
      return false;
    }

    // プライマリカテゴリの取得
    const primaryCategory = options?.primaryCategory || await getUserPrimaryCategory();
    
    // セッションIDの取得
    const currentSessionId = options?.sessionId || getSessionId();

    // イベントデータの構築
    const event: Omit<UserEvent, 'id' | 'created_at'> = {
      user_id: userId,
      event_type: eventType,
      event_data: {
        ...eventData,
        timestamp: new Date().toISOString()
      },
      primary_category: primaryCategory || undefined,
      session_id: currentSessionId
    };

    // Supabaseに送信
    const { error } = await supabase
      .from('user_events')
      .insert([event]);

    if (error) {
      console.error('イベントトラッキングエラー:', error);
      return false;
    }

    // デバッグ用ログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 イベント送信:', {
        type: eventType,
        category: primaryCategory,
        session: currentSessionId,
        data: eventData
      });
    }

    return true;
  } catch (error) {
    console.error('イベントトラッキング失敗:', error);
    return false;
  }
}

// よく使用されるイベントのヘルパー関数
export const analytics = {
  // オンボーディング
  trackCategorySelection: (primaryCategory: string, secondaryCategories?: string[], sourcePage: 'lp_intake' | 'app_signup' = 'app_signup') =>
    trackEvent('onboarding_category_selected', {
      primary_category: primaryCategory,
      secondary_categories: secondaryCategories,
      source_page: sourcePage
    }),

  // 生成関連
  trackGenerationStart: (generationId: string, presetId?: string, imageCount: number = 1) =>
    trackEvent('generation_created', {
      generation_id: generationId,
      preset_id: presetId,
      image_count: imageCount
    }),

  trackGenerationComplete: (generationId: string, processingTimeMs: number) =>
    trackEvent('generation_completed', {
      generation_id: generationId,
      processing_time_ms: processingTimeMs,
      image_count: 1
    }),

  trackGenerationError: (generationId: string, errorCode: string, errorMessage?: string) =>
    trackEvent('generation_interrupted', {
      generation_id: generationId,
      error_code: errorCode,
      error_message: errorMessage,
      image_count: 1
    }),

  // アセット関連
  trackAssetAdoption: (assetId: string, assetType: 'banner' | 'preset' | 'image', rating?: number) =>
    trackEvent('asset_adopted', {
      asset_id: assetId,
      asset_type: assetType,
      rating: rating
    }),

  trackAssetRejection: (assetId: string, assetType: 'banner' | 'preset' | 'image', reason?: string) =>
    trackEvent('asset_rejected', {
      asset_id: assetId,
      asset_type: assetType,
      reason: reason
    }),

  // 編集関連
  trackManualEdit: (editType: 'move' | 'resize' | 'rotate' | 'delete' | 'add_text' | 'change_preset', targetElement: 'image' | 'text' | 'logo' | 'background', editCount: number = 1) =>
    trackEvent('manual_edit_applied', {
      edit_type: editType,
      target_element: targetElement,
      edit_count: editCount
    }),

  // プリセット選択
  trackPresetSelection: (presetId: string, presetCategory: string, selectionSource: 'category_default' | 'user_selection' = 'user_selection') =>
    trackEvent('preset_selected', {
      preset_id: presetId,
      preset_category: presetCategory,
      selection_source: selectionSource
    }),

  // アップロード
  trackImageUpload: (fileSizeBytes: number, fileType: string, processingDurationMs?: number) =>
    trackEvent('image_uploaded', {
      file_size_bytes: fileSizeBytes,
      file_type: fileType,
      processing_duration_ms: processingDurationMs
    }),

  trackLogoUpload: (fileSizeBytes: number, fileType: string, processingDurationMs?: number) =>
    trackEvent('logo_uploaded', {
      file_size_bytes: fileSizeBytes,
      file_type: fileType,
      processing_duration_ms: processingDurationMs
    }),

  // セッション
  trackSessionStart: () => {
    generateSessionId(); // 新しいセッションIDを生成
    return trackEvent('session_started', {});
  },

  trackSessionEnd: (durationMs?: number, pageViews?: number, actionsCount?: number) =>
    trackEvent('session_ended', {
      session_duration_ms: durationMs,
      page_views: pageViews,
      actions_count: actionsCount
    }),

  // エクスポート
  trackBannerExport: (format: string, size: string) =>
    trackEvent('banner_exported', {
      file_type: format,
      version: size
    }),

  // プリセット開発者ツール用イベント
  trackPresetPreviewOpened: (category: string, source: 'dev_page' | 'testing' = 'dev_page') =>
    trackEvent('preset_preview_opened', {
      category,
      source,
      timestamp: new Date().toISOString()
    }),

  trackPresetApplied: (category: string, presetName: string, source: 'dev_page' | 'app' = 'dev_page') =>
    trackEvent('preset_applied', {
      category,
      preset_name: presetName,
      source,
      timestamp: new Date().toISOString()
    }),

  trackPresetSnapshotSaved: (category: string, snapshotId: string) =>
    trackEvent('preset_snapshot_saved', {
      category,
      snapshot_id: snapshotId,
      timestamp: new Date().toISOString()
    }),

  trackPresetSnapshotRestored: (category: string, snapshotId: string) =>
    trackEvent('preset_snapshot_restored', {
      category,
      snapshot_id: snapshotId,
      timestamp: new Date().toISOString()
    }),

  // 汎用イベントトラッキング（開発者向け）
  trackEvent: (eventName: string, properties: Record<string, unknown> = {}) =>
    trackEvent(eventName, properties)
};

// セッション管理用のReactフック（オプション）
export function useAnalyticsSession() {
  const startSession = () => analytics.trackSessionStart();
  const endSession = (durationMs?: number) => analytics.trackSessionEnd(durationMs);
  
  return { startSession, endSession, sessionId: getSessionId() };
}

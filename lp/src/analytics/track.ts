// 共通イベントトラッキングシステム
// LP/APP共通で使用するシンプルなトラッキング関数

import eventsSchema from './events.schema.json';

// セッションIDの管理
let currentSessionId: string | null = null;

// セッションIDの生成・取得
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-session';
  }

  if (!currentSessionId) {
    // 既存のセッションIDをチェック
    currentSessionId = sessionStorage.getItem('analytics_session_id');
    
    if (!currentSessionId) {
      // 新しいセッションIDを生成
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', currentSessionId);
    }
  }
  
  return currentSessionId;
}

// 現在のユーザーカテゴリを取得（LP/APPで異なる実装）
export function getCurrentUserCategory(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // LP: クエリパラメータから取得
    const urlParams = new URLSearchParams(window.location.search);
    const pcFromQuery = urlParams.get('pc');
    if (pcFromQuery) return pcFromQuery;
    
    // APP: ローカルストレージから取得
    const savedProfile = localStorage.getItem('profile:demo-account');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      return profile.primary_category || null;
    }
    
    return null;
  } catch (error) {
    console.warn('カテゴリ取得エラー:', error);
    return null;
  }
}

// 現在のソース（LP/APP）を判定
export function getCurrentSource(): 'LP' | 'APP' {
  if (typeof window === 'undefined') return 'APP';
  
  // ポート番号やURLパスで判定
  const { port, pathname } = window.location;
  
  // LPのポート番号（3001, 3004など）やパスで判定
  if (port === '3001' || port === '3004' || pathname.includes('/lp/')) {
    return 'LP';
  }
  
  return 'APP';
}

// イベントペイロードの共通フィールドを自動追加
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichPayload(eventName: string, payload: Record<string, any>): Record<string, any> {
  const enriched = {
    ...payload,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    source: getCurrentSource(),
  };
  
  // ユーザー関連イベントにはpcを自動付与
  const userEventTypes = [
    'signup_completed', 
    'generation_created', 
    'asset_adopted', 
    'asset_rejected', 
    'consent_toggled'
  ];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (userEventTypes.includes(eventName) && !(enriched as any).pc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (enriched as any).pc = getCurrentUserCategory();
  }
  
  return enriched;
}

// イベントバリデーション（スキーマチェック）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateEvent(eventName: string, payload: Record<string, any>): boolean {
  const eventSchema = eventsSchema.events[eventName as keyof typeof eventsSchema.events];
  
  if (!eventSchema) {
    console.warn(`未知のイベントタイプ: ${eventName}`);
    return false;
  }
  
  // 必須フィールドのチェック
  for (const requiredField of eventSchema.required_fields) {
    if (!(requiredField in payload) || payload[requiredField] === null || payload[requiredField] === undefined) {
      console.warn(`必須フィールドが不足: ${eventName}.${requiredField}`);
      return false;
    }
  }
  
  // pcフィールドの値チェック
  if (payload.pc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validCategories = (eventSchema.properties as any)?.pc?.enum || [];
    if (validCategories.length > 0 && !validCategories.includes(payload.pc)) {
      console.warn(`無効なカテゴリコード: ${payload.pc}`);
      return false;
    }
  }
  
  return true;
}

// メインのトラッキング関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function track(eventName: string, payload: Record<string, any> = {}): void {
  try {
    // ペイロードを充実化
    const enrichedPayload = enrichPayload(eventName, payload);
    
    // バリデーション
    if (!validateEvent(eventName, enrichedPayload)) {
      console.error('イベントバリデーション失敗:', eventName, enrichedPayload);
      return;
    }
    
    // 現在はコンソールログで出力（後で本格的な送信に差し替え）
    console.log('📊 [ANALYTICS]', eventName, enrichedPayload);
    
    // 開発環境では詳細表示
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 Event: ${eventName}`);
      console.table(enrichedPayload);
      console.groupEnd();
    }
    
    // TODO: 本番環境では実際のAPI/BigQuery/Amplitudeに送信
    // sendToAnalyticsPlatform(eventName, enrichedPayload);
    
  } catch (error) {
    console.error('イベントトラッキングエラー:', error);
  }
}

// 便利なヘルパー関数群
export const analytics = {
  // オンボーディング
  trackCategorySelection(pc: string, sc?: string[], consent?: boolean) {
    track('onboarding_category_selected', { pc, sc, consent });
  },
  
  // サインアップ
  trackSignupCompleted(userId: string, pc: string, sc?: string[], consent?: boolean, email?: string, shopName?: string) {
    track('signup_completed', { 
      user_id: userId, 
      pc, 
      sc, 
      consent, 
      email: email ? hashEmail(email) : undefined, 
      shop_name: shopName 
    });
  },
  
  // 生成
  trackGenerationCreated(userId: string, type: string, generationId?: string, presetId?: string, imageCount?: number) {
    const pc = getCurrentUserCategory();
    track('generation_created', { 
      user_id: userId, 
      pc, 
      type, 
      generation_id: generationId, 
      preset_id: presetId, 
      image_count: imageCount 
    });
  },
  
  // アセット採用
  trackAssetAdopted(userId: string, assetId: string, assetType: string, generationId?: string, rating?: number, reasonTags?: string[]) {
    const pc = getCurrentUserCategory();
    track('asset_adopted', { 
      user_id: userId, 
      pc, 
      asset_id: assetId, 
      asset_type: assetType, 
      generation_id: generationId, 
      rating, 
      reason_tags: reasonTags 
    });
  },
  
  // アセット却下
  trackAssetRejected(userId: string, assetId: string, assetType: string, generationId?: string, reasonTags?: string[]) {
    const pc = getCurrentUserCategory();
    track('asset_rejected', { 
      user_id: userId, 
      pc, 
      asset_id: assetId, 
      asset_type: assetType, 
      generation_id: generationId, 
      reason_tags: reasonTags 
    });
  },
  
  // 同意設定変更
  trackConsentToggled(userId: string, prev: boolean, next: boolean, at?: string) {
    track('consent_toggled', { 
      user_id: userId, 
      prev, 
      next, 
      at 
    });
  },
  
  // セッション開始
  trackSessionStarted(userId?: string, referrer?: string) {
    const pc = getCurrentUserCategory();
    track('session_started', { 
      user_id: userId, 
      pc, 
      referrer 
    });
  }
};

// メールアドレスのハッシュ化（プライバシー保護）
function hashEmail(email: string): string {
  // 簡易ハッシュ化（本番ではより強固な方法を使用）
  return btoa(email).slice(0, 16);
}

// セッション管理用のReactフック
export function useAnalyticsSession() {
  const startSession = (userId?: string, referrer?: string) => {
    analytics.trackSessionStarted(userId, referrer);
  };
  
  return { 
    startSession, 
    sessionId: getSessionId(),
    currentCategory: getCurrentUserCategory(),
    source: getCurrentSource()
  };
}

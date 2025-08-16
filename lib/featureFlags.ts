/**
 * Feature Flag設定
 * 環境別の機能表示制御
 */

// 環境変数からの設定読み込み
const isDevelopment = process.env.NODE_ENV === 'development';
const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging';
const enableDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

export const featureFlags = {
  // 開発者向けツール
  developerTools: {
    presetValidation: isDevelopment || isStaging || enableDevMode,
    analyticsDebug: isDevelopment || enableDevMode,
    performanceProfile: isDevelopment,
  },

  // 実験的機能
  experimental: {
    advancedAI: isStaging || enableDevMode,
    betaFeatures: isDevelopment || isStaging,
  },

  // API機能
  api: {
    mockMode: isDevelopment && !process.env.NEXT_PUBLIC_USE_REAL_API,
    debugLogging: isDevelopment || enableDevMode,
  },

  // UI機能  
  ui: {
    showDebugInfo: isDevelopment,
    enableAnimations: true, // 常に有効
    showPerformanceMetrics: isDevelopment || enableDevMode,
  },

  // 分析・ログ
  analytics: {
    trackingEnabled: !isDevelopment || enableDevMode,
    detailedLogging: isDevelopment || enableDevMode,
    consoleOutput: isDevelopment,
  },
} as const;

/**
 * 機能が有効かどうかを確認
 */
export function isFeatureEnabled(featurePath: string): boolean {
  const keys = featurePath.split('.');
  let current: Record<string, unknown> | boolean = featureFlags;
  
  for (const key of keys) {
    if (typeof current === 'boolean' || current[key] === undefined) {
      console.warn(`Feature flag not found: ${featurePath}`);
      return false;
    }
    current = current[key] as Record<string, unknown> | boolean;
  }
  
  return Boolean(current);
}

/**
 * 開発者ページアクセス可能かチェック
 */
export function canAccessDeveloperPages(): boolean {
  return isFeatureEnabled('developerTools.presetValidation');
}

/**
 * 環境情報を取得
 */
export function getEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    stage: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
    devModeEnabled: enableDevMode,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };
}

/**
 * デバッグ情報の表示（開発時のみ）
 */
export function logFeatureFlags() {
  if (!isDevelopment) return;
  
  console.group('🏗️ Feature Flags Status');
  console.table(featureFlags);
  console.log('🌍 Environment:', getEnvironmentInfo());
  console.groupEnd();
}

// 開発時の自動ログ出力
if (typeof window !== 'undefined' && isDevelopment) {
  logFeatureFlags();
}

/**
 * 環境変数の設定とバリデーション
 */

export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
} as const;

export const isSupabaseConfigured = () => {
  return ENV.SUPABASE_URL && 
         ENV.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
         ENV.SUPABASE_ANON_KEY && 
         ENV.SUPABASE_ANON_KEY !== 'placeholder-anon-key';
};

export const isProductionBuild = () => {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';
};

// ビルド時のエラーを防ぐため、必須環境変数をチェック
if (isProductionBuild() && !isSupabaseConfigured()) {
  console.warn('⚠️ Supabase configuration missing in production build');
}

-- 学習・分析用イベントテーブルのスキーマ
-- Supabase SQLエディタで実行してください

-- イベントトラッキングテーブル
CREATE TABLE IF NOT EXISTS user_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  primary_category text,
  session_id text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のイベントのみアクセス可能
CREATE POLICY "Users can view own events" ON user_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- インデックス作成（分析クエリの高速化）
CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON user_events(user_id);
CREATE INDEX IF NOT EXISTS user_events_event_type_idx ON user_events(event_type);
CREATE INDEX IF NOT EXISTS user_events_primary_category_idx ON user_events(primary_category);
CREATE INDEX IF NOT EXISTS user_events_created_at_idx ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_event_data_idx ON user_events USING GIN(event_data);

-- 複合インデックス（分析用）
CREATE INDEX IF NOT EXISTS user_events_category_type_idx ON user_events(primary_category, event_type);
CREATE INDEX IF NOT EXISTS user_events_type_created_idx ON user_events(event_type, created_at DESC);

-- イベントタイプの制約
ALTER TABLE user_events 
ADD CONSTRAINT valid_event_type 
CHECK (event_type IN (
  'onboarding_category_selected',
  'generation_created',
  'generation_completed',
  'generation_interrupted',
  'asset_adopted',
  'asset_rejected',
  'manual_edit_applied',
  'banner_exported',
  'preset_selected',
  'image_uploaded',
  'logo_uploaded',
  'session_started',
  'session_ended'
));

-- コメント追加
COMMENT ON TABLE user_events IS 'ユーザーの行動イベントを記録するテーブル（AI学習・分析用）';
COMMENT ON COLUMN user_events.event_type IS 'イベントの種類';
COMMENT ON COLUMN user_events.event_data IS 'イベントの詳細データ（JSON形式）';
COMMENT ON COLUMN user_events.primary_category IS 'ユーザーの主要カテゴリ（分析用）';
COMMENT ON COLUMN user_events.session_id IS 'セッションID（ユーザー行動の追跡用）';

-- 集計用ビュー（分析用）
CREATE OR REPLACE VIEW analytics_category_adoption AS
SELECT 
  primary_category,
  COUNT(*) FILTER (WHERE event_type = 'asset_adopted') as adoption_count,
  COUNT(*) FILTER (WHERE event_type = 'asset_rejected') as rejection_count,
  COUNT(*) FILTER (WHERE event_type = 'generation_created') as generation_count,
  COUNT(*) FILTER (WHERE event_type = 'manual_edit_applied') as edit_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as date
FROM user_events 
WHERE primary_category IS NOT NULL
GROUP BY primary_category, DATE_TRUNC('day', created_at)
ORDER BY date DESC, primary_category;

-- 日次サマリービュー
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  event_type,
  primary_category,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM user_events
GROUP BY DATE_TRUNC('day', created_at), event_type, primary_category
ORDER BY date DESC, event_type, primary_category;

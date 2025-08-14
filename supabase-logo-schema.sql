-- ユーザーロゴテーブルを作成
CREATE TABLE IF NOT EXISTS user_logos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_logos ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のロゴのみアクセス可能
CREATE POLICY "Users can view own logos" ON user_logos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logos" ON user_logos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logos" ON user_logos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logos" ON user_logos
  FOR DELETE USING (auth.uid() = user_id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS user_logos_user_id_idx ON user_logos(user_id);
CREATE INDEX IF NOT EXISTS user_logos_created_at_idx ON user_logos(created_at DESC);

-- ストレージバケットを作成（Supabase管理画面で実行するか、以下のSQLで作成）
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-logos', 'user-logos', true);

-- ストレージポリシーを設定
-- CREATE POLICY "Users can upload own logos" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own logos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own logos" ON storage.objects
--   FOR DELETE USING (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

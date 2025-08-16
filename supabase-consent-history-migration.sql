-- 同意履歴テーブルの作成マイグレーション
-- Supabase SQLエディタで実行してください

-- consent_historyテーブルを作成
CREATE TABLE IF NOT EXISTS consent_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prev_consent boolean NOT NULL,
  next_consent boolean NOT NULL,
  changed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- インデックス追加（ユーザー別の時系列検索を高速化）
CREATE INDEX IF NOT EXISTS consent_history_user_id_idx ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS consent_history_changed_at_idx ON consent_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS consent_history_user_changed_idx ON consent_history(user_id, changed_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分の履歴のみ閲覧可能
CREATE POLICY "Users can view own consent history" ON consent_history
FOR SELECT USING (auth.uid() = user_id);

-- ポリシー: システムのみが履歴を挿入可能（service_role経由）
CREATE POLICY "Only system can insert consent history" ON consent_history
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- コメント追加
COMMENT ON TABLE consent_history IS 'ユーザーの学習同意変更履歴';
COMMENT ON COLUMN consent_history.user_id IS 'ユーザーID（auth.users参照）';
COMMENT ON COLUMN consent_history.prev_consent IS '変更前の同意状態';
COMMENT ON COLUMN consent_history.next_consent IS '変更後の同意状態';
COMMENT ON COLUMN consent_history.changed_at IS '変更日時';

-- 既存ユーザーの初期履歴データ作成（任意実行）
-- この部分は手動で実行するかコメントアウトしておく
/*
INSERT INTO consent_history (user_id, prev_consent, next_consent, changed_at)
SELECT 
  id as user_id,
  false as prev_consent,
  COALESCE(model_training_consent, false) as next_consent,
  created_at as changed_at
FROM auth.users 
WHERE EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.users.id
)
AND NOT EXISTS (
  SELECT 1 FROM consent_history ch WHERE ch.user_id = auth.users.id
);
*/

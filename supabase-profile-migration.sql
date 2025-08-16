-- ユーザープロファイルにカテゴリ情報を追加するマイグレーション
-- Supabase SQLエディタで実行してください

-- profilesテーブルにカテゴリ関連フィールドを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primary_category text,
ADD COLUMN IF NOT EXISTS secondary_categories text[],
ADD COLUMN IF NOT EXISTS model_training_consent boolean default false;

-- カテゴリバリデーション用のチェック制約
ALTER TABLE profiles 
ADD CONSTRAINT valid_primary_category 
CHECK (primary_category IN (
  'fashion', 'car_parts', 'home_electronics', 'interior', 
  'food_beverage', 'beauty_health', 'sports_outdoor', 'hobby_entertainment'
));

-- secondary_categoriesの上限チェック（最大3つ）
ALTER TABLE profiles 
ADD CONSTRAINT secondary_categories_limit 
CHECK (array_length(secondary_categories, 1) <= 3);

-- インデックス追加（カテゴリ検索の高速化）
CREATE INDEX IF NOT EXISTS profiles_primary_category_idx ON profiles(primary_category);
CREATE INDEX IF NOT EXISTS profiles_secondary_categories_idx ON profiles USING GIN(secondary_categories);

-- 既存レコードのための初期値設定（必要に応じて）
-- UPDATE profiles SET 
--   primary_category = NULL,
--   secondary_categories = '{}',
--   model_training_consent = false
-- WHERE primary_category IS NULL;

COMMENT ON COLUMN profiles.primary_category IS 'ユーザーの主要出品カテゴリ（必須）';
COMMENT ON COLUMN profiles.secondary_categories IS 'ユーザーの追加カテゴリ（任意・最大3つ）';
COMMENT ON COLUMN profiles.model_training_consent IS 'AI学習利用への同意（デフォルト: false）';

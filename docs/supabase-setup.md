# Supabase設定ガイド

## 1. 新規プロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」または「New project」をクリック
3. プロジェクト名を入力（例: banner-ai）
4. データベースパスワードを設定
5. リージョンを選択（Asia Northeast (Tokyo)推奨）
6. 「Create new project」をクリック

## 2. 環境変数の設定

プロジェクト作成後、Settings > API からProject URLとanon publicキーを取得

`.env.local`ファイルを更新:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. データベーススキーマの作成

SQL Editor で `lib/supabase/schema.sql` の内容を実行:

```sql
-- プロファイル（auth.users と1:1）
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shop_name text,
  created_at timestamptz default now()
);

-- 学習結果（ユーザー別"好み"）
create table if not exists user_style_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  font_prefs jsonb default '{}'::jsonb,
  color_prefs jsonb default '{}'::jsonb,
  layout_prefs jsonb default '{}'::jsonb,
  segments jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 生成イベント（差分ログ）
create table if not exists banner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text,
  event_type text check (event_type in ('proposal','tweak','approve')),
  spec_before jsonb,
  spec_after jsonb,
  deltas jsonb,
  score int,
  created_at timestamptz default now()
);

-- インデックス作成
create index if not exists banner_events_user_idx on banner_events(user_id, created_at desc);

-- RLS有効化
alter table profiles enable row level security;
alter table user_style_profile enable row level security;
alter table banner_events enable row level security;

-- RLS: 自分の行だけ読める/書ける
create policy "profiles self" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  
create policy "style self" on user_style_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  
create policy "events self" on banner_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 4. Authentication設定

1. Authentication > Settings > Auth Providers
2. Email認証を有効化
3. 必要に応じてMagic Linkを有効化
4. Site URLを設定: `http://localhost:3000` (開発時)

## 5. 動作確認

1. アプリを起動: `npm run dev`
2. ヘッダーの「ログイン」ボタンをクリック
3. メールアドレスを入力して認証メール送信
4. メール内のリンクをクリックしてログイン完了
5. 「採用（学習）」ボタンで学習データがクラウドに保存される

## 6. ストレージ設定（オプション）

将来的にファイルアップロード機能を追加する場合:

1. Storage > Create bucket
2. バケット名: `samples`, `products`, `exports`
3. Public accessの設定
4. RLS Policiesでuser_idベースのアクセス制御

## トラブルシューティング

### 認証エラー
- Site URLの設定を確認
- .env.localの環境変数を確認
- ブラウザのコンソールでエラーをチェック

### データベースエラー
- RLSポリシーが正しく設定されているか確認
- テーブルが作成されているか確認
- SQLエディタでクエリを直接テスト

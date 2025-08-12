# Supabase セットアップ手順

このプロジェクトでは、学習データの永続化にSupabaseを使用しています。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 新規プロジェクトを作成
3. プロジェクトのURLとAPIキーを取得

## 2. 環境変数の設定

`.env.local` ファイルに以下の値を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. データベースの初期化

SupabaseコンソールのSQL Editorで `supabase-schema.sql` を実行してください。

このスクリプトは以下を作成します：
- `accounts` テーブル: ユーザーアカウント
- `account_style_profile` テーブル: 個人のスタイル好み
- `banner_events` テーブル: バナー生成・学習イベント
- デモアカウントの初期データ

## 4. 機能説明

### ローカル学習
- ブラウザのlocalStorageに学習データを保存
- オフラインでも動作

### クラウド学習
- Supabaseに学習イベントを記録
- 複数デバイス間でのデータ同期（将来実装予定）
- 学習パターンの分析（将来実装予定）

## 5. テスト

1. アプリを起動: `npm run dev`
2. バナーを調整
3. 「採用（学習）」ボタンをクリック
4. Supabaseのテーブルでデータが記録されていることを確認

## データベーススキーマ

### accounts
- `id`: UUID (primary key)
- `name`: テキスト
- `created_at`: タイムスタンプ

### account_style_profile
- `account_id`: UUID (foreign key)
- `font_prefs`: JSONB (フォント好み)
- `color_prefs`: JSONB (色好み)
- `layout_prefs`: JSONB (レイアウト好み)
- `segments`: JSONB (セグメント情報)
- `updated_at`: タイムスタンプ

### banner_events
- `id`: UUID (primary key)
- `account_id`: UUID (foreign key)
- `audience`: テキスト (対象オーディエンス)
- `event_type`: テキスト (proposal/tweak/approve)
- `spec_before`: JSONB (変更前のバナー仕様)
- `spec_after`: JSONB (変更後のバナー仕様)
- `deltas`: JSONB (差分情報)
- `score`: 整数 (評価スコア)
- `created_at`: タイムスタンプ

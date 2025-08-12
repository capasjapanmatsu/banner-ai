# ShopDesigner AI - LP & App デプロイ手順

## プロジェクト構成

- **LP (ランディングページ)**: `/lp` フォルダ
- **App (メインアプリ)**: ルートフォルダ

## Vercelデプロイ手順

### 1. LPプロジェクトのデプロイ

1. Vercelダッシュボードで「New Project」をクリック
2. このリポジトリを選択
3. **Root Directory**: `lp` を指定
4. **Project Name**: `shopdesignerai-lp`
5. デプロイを実行

### 2. アプリプロジェクトのデプロイ

1. Vercelダッシュボードで「New Project」をクリック
2. 同じリポジトリを選択
3. **Root Directory**: 空白（ルート）
4. **Project Name**: `shopdesignerai-app`
5. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
6. デプロイを実行

## ドメイン設定

### 1. カスタムドメインの追加

**LPプロジェクト**:
- `www.shopdesignerai.com`

**アプリプロジェクト**:
- `app.shopdesignerai.com`

### 2. リダイレクト設定

**`shopdesignerai.com` → `www.shopdesignerai.com`**

Vercelの設定で以下のリダイレクトルールを追加:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "https://www.shopdesignerai.com",
      "permanent": true
    }
  ]
}
```

## 開発環境

- **LP**: `http://localhost:3001`
- **App**: `http://localhost:3002`

## 起動コマンド

```bash
# LP開発サーバー
cd lp && npm run dev

# アプリ開発サーバー
npm run dev
```

## 国際化設定

LPプロジェクトには`i18n`設定が含まれています:
- 対応言語: 日本語(ja), 英語(en)
- デフォルト: 日本語(ja)

## 注意事項

1. 両プロジェクトは同じリポジトリから異なるルートディレクトリでデプロイされます
2. 環境変数は各プロジェクトで個別に設定が必要です
3. ドメイン設定後は、Google OAuth設定のリダイレクトURIも更新してください

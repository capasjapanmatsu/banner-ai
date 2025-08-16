# STEP 9: Registration Token Handoff System

LP（ランディングページ）からAPP（メインアプリ）への安全なデータ受け渡しシステムの実装。

## 概要

従来のクエリパラメータ方式に加えて、より安全なトークンベースの受け渡し方式を実装。

### 実装済み機能

✅ **LP側 (ポート3001)**
- `/api/registration-token` - トークン生成API
- `/api/registration-token/consume` - トークン消費API  
- `tokenStorage.ts` - トークン管理ユーティリティ
- `intake/page.tsx` - 環境変数による方式切り替え対応

✅ **APP側 (ポート3000)**
- `/api/verify` - トークン検証・消費API
- `signup/page.tsx` - トークンベースデータ取得対応

## 使用方法

### 1. 環境変数設定

**LP側 (.env.local)**
```bash
# トークン方式を有効にする場合
NEXT_PUBLIC_USE_TOKEN_HANDOFF=true
TOKEN_TTL_MINUTES=15
NEXT_PUBLIC_APP_URL=http://localhost:3000

# クエリパラメータ方式を使用する場合
NEXT_PUBLIC_USE_TOKEN_HANDOFF=false
```

**APP側 (.env.local)**
```bash
LP_API_URL=http://localhost:3001
```

### 2. 開発サーバー起動

```bash
# ターミナル1: LP側
cd lp
npm run dev

# ターミナル2: APP側  
cd app
npm run dev
```

### 3. テスト手順

1. **LP事前アンケート** → http://localhost:3001/signup/intake
2. **カテゴリ選択** → 「ファッション」等を選択
3. **送信** → 環境変数に応じて下記いずれかの方式でAPPにリダイレクト

**クエリパラメータ方式 (従来)**
```
http://localhost:3000/signup?pc=fashion&sc=beauty_health&consent=1
```

**トークン方式 (新機能)**
```
http://localhost:3000/signup?token=reg_1234567890_abc123def
```

### 4. 動作確認ポイント

#### LP側ログ
```
🎫 Registration token created: {
  token: "reg_...",
  payload: { pc: "fashion", sc: ["beauty_health"], ... },
  expires_at: "2024-..."
}
```

#### APP側ログ
```
🎫 トークンから取得した事前アンケートデータ: {
  primaryCategory: "fashion",
  secondaryCategories: ["beauty_health"],
  learningConsent: true
}
```

## セキュリティ特徴

- **TTL制限**: デフォルト15分で自動期限切れ
- **一回使用制限**: 消費後は再利用不可
- **トークン検証**: 無効/期限切れ/使用済みの検出
- **メモリストレージ**: 開発用（本番ではRedis/DB推奨）

## フォールバック設計

- トークン検証失敗時は従来のクエリパラメータ方式にフォールバック
- 環境変数で簡単に方式切り替え可能
- 両方式とも同じUI/UXを提供

## 本番環境への展開

### 必要な変更点

1. **永続化ストレージ**
```typescript
// tokenStorage.ts を Redis/Database 実装に置き換え
class ProductionTokenStorage {
  async createToken(payload: RegistrationTokenPayload): Promise<string> {
    // Redis/DB に保存
  }
  // ...
}
```

2. **認証・レート制限**
```typescript
// API routes に認証ミドルウェア追加
// IP別レート制限実装
```

3. **環境変数**
```bash
# 本番環境
NEXT_PUBLIC_USE_TOKEN_HANDOFF=true
TOKEN_TTL_MINUTES=10
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
LP_API_URL=https://lp.yourdomain.com
```

## トラブルシューティング

### よくある問題

1. **トークンが無効**
   - LP/APP間のURL設定確認
   - 環境変数の同期確認

2. **期限切れエラー**
   - TTL設定確認
   - タイムゾーン設定確認

3. **CORS エラー**
   - next.config.ts でCORS設定追加

### デバッグコマンド

```bash
# LP側トークン統計確認
# http://localhost:3001/api/registration-token/stats (実装時)

# ログレベル設定
DEBUG=token:* npm run dev
```

## 次のステップ

- [ ] Redis/Database 永続化実装
- [ ] 認証ミドルウェア追加  
- [ ] レート制限実装
- [ ] 監視・アラート設定
- [ ] パフォーマンス最適化

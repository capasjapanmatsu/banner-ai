# STEP 10: 同意の監査ログ & UI例外対応の強化

オプトイン同意の変更履歴を時系列で保存し、トークン失効や不正入力などの例外でもユーザーが迷わないようにする機能の実装。

## 実装内容

### 10-1. データベース設計 ✅

**新テーブル: `consent_history`**
```sql
CREATE TABLE consent_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  prev_consent boolean NOT NULL,
  next_consent boolean NOT NULL,
  changed_at timestamp with time zone DEFAULT now()
);
```

- 同意状態の変更履歴を完全記録
- RLS（Row Level Security）で個人情報保護
- インデックス設定でクエリ高速化

### 10-2. API実装 ✅

**PATCH `/api/profile/consent`**
- リクエスト: `{ "next": boolean }`
- プロフィール更新 + 履歴記録のアトミック処理
- 同値変更のスキップ機能

**GET `/api/profile/consent/history`**
- 個人の同意変更履歴取得
- 最新順ソート、件数制限対応

### 10-3. 設定画面UI ✅

**ConsentSettingsコンポーネント**
- スタイリッシュなトグルスイッチ
- 最新変更日の自動表示
- ローディング状態の表示

**文言の改善**
```
生成品質向上のため、画像・指示・フィードバックを匿名化して学習に利用します。
設定はいつでも変更できます。
```

### 10-4. 例外対応システム ✅

**エラーハンドリング統一**
- `src/i18n/errors.json` - エラーメッセージ統一管理
- `src/utils/errorHandler.ts` - エラー処理ユーティリティ
- `components/ErrorDisplay.tsx` - 統一エラー表示UI

**対応エラー**
- `token_expired` - 有効期限切れ
- `invalid_token` - 無効なトークン  
- `token_already_used` - 使用済みトークン
- `invalid_category` - 不正カテゴリ
- `network_error` - 接続エラー
- `unknown_error` - 一般エラー

**ユーザー導線**
- エラー発生時の明確な案内
- 「LPに戻る」「再試行」アクション
- 行き止まりの排除

### 10-5. テスト方法

#### A. 同意履歴のテスト

1. **設定画面アクセス**
   ```
   http://localhost:3000/settings/profile
   ```

2. **トグル操作確認**
   - 学習利用の ON/OFF 切り替え
   - 変更日時の自動更新確認
   - 同値変更時のスキップ動作

3. **履歴API確認**
   ```bash
   # 開発者ツール → Network タブで確認
   GET /api/profile/consent/history?limit=1
   ```

#### B. エラーハンドリングのテスト

1. **期限切れトークン**
   ```
   http://localhost:3000/signup?token=expired_token_example
   ```
   
2. **無効なトークン**
   ```
   http://localhost:3000/signup?token=invalid_token_123
   ```

3. **不正カテゴリ**
   - LP側でカテゴリコードを手動改変
   - 400エラーでフォールバック表示確認

#### C. LP→APP統合テスト

1. **正常フロー**
   ```
   LP事前アンケート → カテゴリ選択 → APP サインアップ
   ```

2. **エラーフロー**
   ```
   無効リンク → エラー表示 → 「LPに戻る」→ 再実行
   ```

## 実装効果

### ✅ **監査要件の充足**
- 同意変更の完全なトレーサビリティ
- GDPR/個人情報保護法対応の基盤

### ✅ **UX向上**
- エラー時の明確な導線
- 一貫性のあるエラーメッセージ
- ユーザーの迷いを排除

### ✅ **保守性向上**
- エラーメッセージの統一管理
- 再利用可能なエラーコンポーネント
- 型安全なエラーハンドリング

## 受け入れ基準確認

- ✅ **トグル操作時に履歴が1行追加される**
  - ConsentSettings → API呼び出し → DB記録
  
- ✅ **期限切れ/不正のケースで、ユーザーが行き止まりにならない**
  - ErrorDisplay → 明確なアクション → LP復帰/再試行

- ✅ **主要イベントが track(...) で出ている**
  - 既存のSTEP 5, 8実装で対応済み

- ✅ **フラグで クエリ／トークン の両方が切替可能**
  - STEP 9実装で対応済み

- ✅ **同意の変更履歴が保存され、UI に最新の1行が見える**
  - consent_history テーブル + ConsentSettings UI

- ✅ **例外時の導線（戻る・やり直す）が用意されている**
  - ErrorDisplay コンポーネント + 統一エラーハンドリング

## 次のステップ

### 本番環境展開時の考慮事項

1. **パフォーマンス最適化**
   - 履歴テーブルのパーティション分割
   - インデックス最適化

2. **監視・アラート**
   - エラー率の監視
   - 同意率の分析ダッシュボード

3. **セキュリティ強化**
   - レート制限の実装
   - 監査ログの暗号化

これでSTEP 10の実装が完了し、カテゴリドリブンなバナーAIシステムの**同意管理・エラーハンドリング基盤**が整いました！

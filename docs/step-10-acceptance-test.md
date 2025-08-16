# STEP 10 受け入れテスト手順

## 前提条件
- LP: http://localhost:3001 で起動
- APP: http://localhost:3000 で起動  
- Supabaseでconsent_historyマイグレーション実行済み

## テスト1: トグル履歴テスト

### 手順
1. APP設定画面にアクセス
   ```
   http://localhost:3000/settings/profile
   ```

2. **同意トグルを操作**
   - 現在の状態を確認（例: OFF）
   - トグルをクリック → ON に変更
   - トグルをクリック → OFF に変更  
   - トグルをクリック → ON に変更

3. **開発者ツールでネットワーク確認**
   - Network タブを開く
   - `PATCH /api/profile/consent` リクエストを確認
   - レスポンスに `success: true` があることを確認

4. **履歴API確認**
   ```bash
   # ブラウザの開発者ツール > Console で実行
   fetch('/api/profile/consent/history?limit=5')
     .then(r => r.json())
     .then(console.log)
   ```

### 期待結果
- ✅ 3回の変更で履歴が**2行**追加される
  - OFF → ON (1行目)  
  - ON → OFF (2行目)
  - OFF → ON (3行目: 最初と同じ状態だが記録される)

- ✅ 楽観的UI: クリック直後に画面が更新される
- ✅ 最新変更日が表示される

## テスト2: トークン期限切れエラー

### 手順
1. **無効なトークンでサインアップ画面アクセス**
   ```
   http://localhost:3000/signup?token=expired_fake_token_12345
   ```

2. **エラー表示を確認**
   - 赤い枠のエラーメッセージが表示される
   - タイトル: "有効期限が切れました"
   - メッセージ: "有効期限が切れました。もう一度お手続きください。"
   - ボタン: "LPに戻る"

3. **導線確認**
   - "LPに戻る"ボタンをクリック
   - LP事前アンケートページにリダイレクトされる
   ```
   http://localhost:3001/signup/intake
   ```

### 期待結果
- ✅ エラーメッセージが `src/i18n/errors.json` の `token_expired` から表示される
- ✅ ユーザーが迷子にならない（明確な復帰経路）

## テスト3: エラー定義の統一確認

### 手順
1. **エラー定義ファイル確認**
   ```bash
   # ファイル内容確認
   cat src/i18n/errors.json
   ```

2. **使用箇所を検索**
   ```bash
   # エラーキーの使用箇所を確認
   grep -r "token_expired\|invalid_category\|unknown_error" app/ components/ src/
   ```

3. **ErrorDisplayコンポーネント確認**
   - `components/ErrorDisplay.tsx` がすべてのエラー表示に使用されている
   - `src/utils/errorHandler.ts` でエラー判定が統一されている

### 期待結果
- ✅ 全エラーが1箇所（`errors.json`）で定義されている
- ✅ 統一されたErrorDisplayコンポーネントで表示される
- ✅ ハードコードされたエラーメッセージが存在しない

## テスト4: カテゴリ不正のフォールバック

### 手順
1. **LP事前アンケートで正常選択**
   ```
   http://localhost:3001/signup/intake
   ```

2. **送信前にブラウザ開発者ツールでカテゴリ改変**
   ```javascript
   // Console で実行（送信前）
   document.querySelector('input[name="primaryCategory"]:checked').value = 'invalid_category'
   ```

3. **送信してAPPサインアップ確認**
   - サーバー側で400エラーが返される
   - フォールバック表示（再選択可能なUI）が表示される

### 期待結果
- ✅ 不正カテゴリで400エラー
- ✅ エラー時にカテゴリ選択UIが表示される
- ✅ ユーザーが再選択可能

## コンソールログ確認

### API成功時のログ
```
✅ Consent updated: {
  user_id: "xxx",
  prev_consent: false,
  next_consent: true,
  timestamp: "2024-..."
}
```

### イベントトラッキングログ
```
📊 Analytics Event: consent_toggled {
  prev: false,
  next: true,
  user_id: "xxx"
}
```

### エラー時のログ
```
❌ Token verification error: Error: Token verification failed: 410
🎫 エラーから復帰: token_expired
```

## 合格基準

- [ ] トグル操作で履歴が正しく記録される（同値はスキップ）
- [ ] 楽観的UIが動作する（即座に反映→失敗時のみ復帰）
- [ ] 全エラーが`errors.json`から表示される
- [ ] トークン期限切れから"LPに戻る"で復帰できる
- [ ] カテゴリ不正時に再選択UIが表示される
- [ ] `analytics.trackConsentToggled`イベントが発火する

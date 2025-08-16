# 🎨 Banner AI - 高機能バナー自動生成システム

AI を活用した高度なバナー自動生成システム。EC サイト・広告・SNS 向けのバナーを効率的に作成できます。

## ✨ 主要機能

### 🎯 基本機能（ステップ 1-16）

- **多彩なテンプレート**: product-hero, rank-award, limited-time, variant-grid など
- **EC モール対応**: 楽天市場、Yahoo!ショッピング向けプリセット
- **レスポンシブ生成**: 複数サイズ対応
- **高度なタイポグラフィ**: フォント最適化・コントラスト調整

### 🚀 高度機能（ステップ 17-19）

- **背景除去自動化**: AI 背景除去・影エフェクト・床面反射
- **A/B テスト機能**: ε-greedy アルゴリズムによる自動最適化
- **色彩調和**: 自動パレット生成・ブランドカラー調和
- **プロファイル重み学習**: 使用履歴による最適化
- **外部 CTR 取り込み**: 広告パフォーマンス分析
- **プロファイル自動リフレッシュ**: ウェブスクレイピングによる色彩更新
- **カタログレイアウト**: 複数商品グリッド表示
- **パラメトリック微調整**: テナント別カスタマイズ

### 🔧 新機能（ステップ 20）

- **タイトル自動要約**: 日本語特化の文字数最適化・改行最適化
- **フォント自動フェールバック**: システム・プロジェクトフォント自動検出
- **画像アセット管理**: 重複検知・リネーム・最適化

## 🛠️ インストール

```bash
npm install
npm i fs-extra fast-glob image-size
npm i -D @types/image-size
```

## 🚀 使用方法

### Web UI（推奨）

```bash
npm run ui
# http://localhost:3003 でアクセス
```

### CLI 操作

#### 基本的なバナー生成

```bash
# 商品ヒーローバナー
npm run gen:hero

# ランキング受賞バナー
npm run gen:award

# 期間限定セールバナー
npm run gen:limited

# バリエーションバナー
npm run gen:variants
```

#### 高度機能

```bash
# 背景除去付き生成
npm run gen:hero:rembg

# A/Bテスト初期化
npm run ab:init

# プロファイル自動更新
npm run profile:refresh -- --url=https://example.com

# CSV一括カタログ生成
npm run catalog:csv
```

#### ステップ 20 新機能

```bash
# アセット分析・スキャン
npm run assets:scan

# 重複ファイル検出
npm run assets:duplicates

# 重複ファイル削除（ドライラン）
npm run assets:clean

# 重複ファイル削除（実行）
npm run assets:clean:force

# スマートリネーム
npm run assets:rename
```

## 📁 プロジェクト構造

```
src/
├── core/              # コア機能
│   ├── generate.ts    # メイン生成エンジン
│   ├── text.ts        # タイトル自動要約
│   ├── fonts.ts       # フォントフェールバック
│   ├── assets.ts      # アセット管理
│   ├── palette.ts     # 色彩調和
│   └── tweaks.ts      # パラメトリック調整
├── templates/         # テンプレート
├── tools/             # ユーティリティ
│   ├── refresh-profile.ts  # プロファイル自動更新
│   ├── catalog-from-csv.ts # CSV一括処理
│   └── assets.ts           # アセット管理CLI
├── ab/               # A/Bテスト
└── assets/           # アセット
    ├── fonts/        # プロジェクトフォント
    └── library/      # 管理済みアセット
```

## 🎨 テンプレート

### 商品系

- `product-hero`: 商品メインビジュアル
- `product-catalog`: 複数商品カタログ
- `variant-grid`: バリエーション表示

### セール・キャンペーン系

- `basic-sale`: 基本セール
- `limited-time`: 期間限定
- `rank-award`: ランキング受賞

### グリッド・レイアウト系

- `catalog-grid`: 自動グリッドカタログ（最大 8 商品）

## ⚙️ 設定

### プロファイル設定

```json
{
  "colors": {
    "primary": "#D92C2C",
    "secondary": "#ffffff",
    "accent": "#FFD93D",
    "text": "#111111"
  },
  "font": {
    "family": "Noto Sans CJK JP",
    "path": "./fonts/custom.ttf"
  },
  "meta": {
    "brandName": "サンプルストア",
    "industry": "electronics"
  }
}
```

### テナント別微調整

```json
{
  "fontScale": 1.2,
  "imageScale": 0.9,
  "spacingScale": 1.1
}
```

## 📊 A/B テスト

```bash
# テスト初期化
npm run ab:init

# バナー生成（自動A/Bテスト適用）
npm run banner:gen

# 結果分析
node --import tsx src/ab/analyze.ts --tenant=demo
```

## 🎯 最適化機能

### タイトル自動最適化

- 日本語特化の要約アルゴリズム
- 改行位置の自動最適化
- ノイズ除去（型番・JAN コードなど）

### フォントフェールバック

- システムフォント自動検出
- プロジェクトフォント優先
- 文字種別対応（日本語・英語・ディスプレイ）

### アセット最適化

- 重複ファイル自動検出
- MD5 ハッシュベース比較
- スマートリネーム（解像度・一意性保証）

## 🔧 トラブルシューティング

### フォント問題

```bash
# フォント一覧確認
node --import tsx -e "console.log(require('@napi-rs/canvas').GlobalFonts.families)"

# プロジェクトフォント配置
mkdir -p src/assets/fonts
# .ttf/.otfファイルを配置
```

### 背景除去エラー

```bash
# REMBG_MODEを設定
export REMBG_MODE=cli  # または =api
```

### アセット管理

```bash
# 重複分析
npm run assets:scan ./public ./src/assets

# ディスク使用量確認
npm run assets:duplicates
```

## 📝 開発

```bash
# 開発サーバー
npm run dev

# テスト実行
npm test

# E2Eテスト
npm run e2e

# フォーマット
npm run fmt
```

## 🚀 デプロイ

### Vercel

```bash
npm run build
vercel deploy
```

### Docker

```dockerfile
FROM node:18
COPY . .
RUN npm install
EXPOSE 3003
CMD ["npm", "run", "ui"]
```

## 📈 パフォーマンス

- **生成速度**: 平均 2-3 秒/バナー
- **メモリ使用量**: 平均 100-200MB
- **対応画像**: JPEG, PNG, WebP, GIF
- **最大解像度**: 4096x4096px

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🆘 サポート

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [Wiki](https://github.com/your-repo/wiki)
- Examples: [examples/](examples/) ディレクトリ

# Catalog Taxonomy

Banner AI プロジェクトで使用する共有カテゴリ定義パッケージです。
LP（ランディングページ）とAPP（本アプリケーション）間で統一されたカテゴリ管理を提供します。

## 特徴

- 🔄 **LP・APP間の統一**: 同じカテゴリ定義を両プロジェクトで使用
- 🎯 **型安全**: TypeScriptで型定義されたカテゴリ管理
- 🚀 **将来の変更に強い**: 中央集権的なカテゴリ管理
- 📦 **軽量**: 最小限の依存関係

## インストール

```bash
# ワークスペース内での使用
npm install @banner-ai/catalog-taxonomy
```

## 使用方法

```typescript
import { 
  Catalog, 
  PrimaryCategoryCode,
  getCategoryByCode,
  getCategoryLabel,
  getAllCategoryCodes,
  validateCategorySelection
} from '@banner-ai/catalog-taxonomy';

// 全カテゴリを取得
console.log(Catalog.primary);

// 特定のカテゴリを取得
const fashion = getCategoryByCode('fashion');
console.log(fashion); // { code: 'fashion', label_ja: 'ファッション・アパレル' }

// ラベルのみ取得
const label = getCategoryLabel('fashion');
console.log(label); // 'ファッション・アパレル'

// 全コードを取得
const allCodes = getAllCategoryCodes();
console.log(allCodes); // ['fashion', 'car_parts', ...]

// 選択数の検証
const isValid = validateCategorySelection(['fashion', 'beauty_health']);
console.log(isValid); // true (最大3つまで選択可能)
```

## カテゴリ一覧

| コード | 日本語ラベル |
|--------|-------------|
| `fashion` | ファッション・アパレル |
| `car_parts` | 車・バイク（パーツ・用品） |
| `home_electronics` | 家電・AV機器 |
| `interior` | インテリア・家具・雑貨 |
| `food_beverage` | 食品・飲料 |
| `beauty_health` | 美容・健康 |
| `sports_outdoor` | スポーツ・アウトドア |
| `hobby_entertainment` | ホビー・エンタメ |

## 開発

```bash
# ビルド
npm run build

# 開発モード（watch）
npm run dev

# クリーンアップ
npm run clean
```

## 変更履歴

### v1.0.0
- 初期リリース
- 基本的なカテゴリ定義を追加
- 型安全なAPI提供

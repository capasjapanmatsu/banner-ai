import { type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';

// カテゴリ別の初期AI設定
export interface CategoryPreset {
  category: PrimaryCategoryCode;
  name: string;
  description: string;
  aiSettings: {
    // 背景処理設定
    backgroundRemoval: {
      enabled: boolean;
      strength: 'weak' | 'medium' | 'strong';
    };
    // 画像補正設定
    imageEnhancement: {
      enabled: boolean;
      wrinkleReduction: boolean;
      colorBalance: boolean;
      sharpening: boolean;
    };
    // バナーデザイン設定
    bannerDesign: {
      colorScheme: 'vibrant' | 'elegant' | 'minimal' | 'bold';
      layout: 'product-focus' | 'text-heavy' | 'balanced' | 'artistic';
      typography: 'modern' | 'classic' | 'playful' | 'bold';
    };
    // 特殊機能
    specialFeatures: {
      vehicleDetection?: boolean;
      fittingSimulation?: boolean;
      textureAnalysis?: boolean;
      seasonalThemes?: boolean;
    };
  };
  // 推奨バナーサイズ
  recommendedSizes: Array<{
    width: number;
    height: number;
    name: string;
  }>;
  // サンプルプロンプト
  samplePrompts: string[];
}

export const categoryPresets: Record<PrimaryCategoryCode, CategoryPreset> = {
  fashion: {
    category: 'fashion',
    name: 'ファッション・アパレル',
    description: 'アパレル商品に最適化された設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'strong', // 白抜き強
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: true, // しわ軽減 ON
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'elegant', // バナー配色プリセット A
        layout: 'product-focus',
        typography: 'modern',
      },
      specialFeatures: {
        fittingSimulation: true,
        seasonalThemes: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 1200, name: 'Instagram正方形' },
      { width: 1080, height: 1350, name: 'Instagram縦型' },
      { width: 1200, height: 630, name: 'Facebook投稿' },
    ],
    samplePrompts: [
      'スタイリッシュな秋コレクション',
      'カジュアルウェアの新作',
      'エレガントなイブニングドレス',
    ],
  },

  car_parts: {
    category: 'car_parts',
    name: '車・バイク（パーツ・用品）',
    description: '自動車・バイク用品に特化した設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'weak', // 背景差し替え弱
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'bold',
        layout: 'text-heavy',
        typography: 'bold',
      },
      specialFeatures: {
        vehicleDetection: true, // 車種判別 ON
        fittingSimulation: true, // 装着合成の候補有効化
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 800, name: 'カタログ横型' },
      { width: 800, height: 800, name: '商品詳細' },
      { width: 1200, height: 630, name: 'SNS投稿' },
    ],
    samplePrompts: [
      '高性能エンジンパーツ',
      'スタイリッシュなホイール',
      'プロ仕様のカーアクセサリー',
    ],
  },

  home_electronics: {
    category: 'home_electronics',
    name: '家電・AV機器',
    description: '家電製品に適した技術仕様重視の設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'medium',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'minimal',
        layout: 'balanced',
        typography: 'modern',
      },
      specialFeatures: {
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 900, name: '製品カタログ' },
      { width: 800, height: 600, name: '仕様比較' },
      { width: 1200, height: 630, name: 'プロモーション' },
    ],
    samplePrompts: [
      '最新テクノロジー搭載',
      'エネルギー効率の良い家電',
      'スマートホーム対応',
    ],
  },

  interior: {
    category: 'interior',
    name: 'インテリア・家具・雑貨',
    description: '空間演出を重視したインテリア設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'medium',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: false,
      },
      bannerDesign: {
        colorScheme: 'elegant',
        layout: 'artistic',
        typography: 'classic',
      },
      specialFeatures: {
        seasonalThemes: true,
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 800, name: '部屋全体' },
      { width: 800, height: 1000, name: '縦型商品' },
      { width: 1200, height: 630, name: 'コレクション' },
    ],
    samplePrompts: [
      'ナチュラルな北欧スタイル',
      'モダンなミニマリスト空間',
      '温かみのある和風インテリア',
    ],
  },

  food_beverage: {
    category: 'food_beverage',
    name: '食品・飲料',
    description: '美味しさを伝える食品専用設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'strong',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'vibrant',
        layout: 'product-focus',
        typography: 'playful',
      },
      specialFeatures: {
        seasonalThemes: true,
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 1200, name: 'Instagram正方形' },
      { width: 1080, height: 1350, name: 'ストーリー縦型' },
      { width: 1200, height: 630, name: 'Facebook投稿' },
    ],
    samplePrompts: [
      '新鮮な地元産食材',
      '手作りの美味しさ',
      '健康的なオーガニック食品',
    ],
  },

  beauty_health: {
    category: 'beauty_health',
    name: '美容・健康',
    description: '美容・健康商品に特化した設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'strong',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: true,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'elegant',
        layout: 'product-focus',
        typography: 'modern',
      },
      specialFeatures: {
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 1200, name: 'Instagram正方形' },
      { width: 1080, height: 1350, name: 'Instagram縦型' },
      { width: 1200, height: 630, name: 'プロモーション' },
    ],
    samplePrompts: [
      '自然由来の美容成分',
      'アンチエイジング効果',
      '敏感肌にも優しい',
    ],
  },

  sports_outdoor: {
    category: 'sports_outdoor',
    name: 'スポーツ・アウトドア',
    description: 'アクティブなライフスタイル向け設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'medium',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'bold',
        layout: 'balanced',
        typography: 'bold',
      },
      specialFeatures: {
        seasonalThemes: true,
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 800, name: '横型アクション' },
      { width: 800, height: 800, name: '商品詳細' },
      { width: 1200, height: 630, name: 'キャンペーン' },
    ],
    samplePrompts: [
      'プロ仕様のスポーツ用品',
      'アウトドア冒険ギア',
      'フィットネス最新アイテム',
    ],
  },

  hobby_entertainment: {
    category: 'hobby_entertainment',
    name: 'ホビー・エンタメ',
    description: '趣味・エンターテイメント商品向け設定',
    aiSettings: {
      backgroundRemoval: {
        enabled: true,
        strength: 'medium',
      },
      imageEnhancement: {
        enabled: true,
        wrinkleReduction: false,
        colorBalance: true,
        sharpening: true,
      },
      bannerDesign: {
        colorScheme: 'vibrant',
        layout: 'artistic',
        typography: 'playful',
      },
      specialFeatures: {
        textureAnalysis: true,
      },
    },
    recommendedSizes: [
      { width: 1200, height: 1200, name: 'Instagram正方形' },
      { width: 1200, height: 800, name: 'コレクション' },
      { width: 800, height: 600, name: '商品詳細' },
    ],
    samplePrompts: [
      'コレクター向けアイテム',
      '限定版グッズ',
      'クリエイティブなホビー用品',
    ],
  },
};

// プリセット取得ヘルパー関数
export const getCategoryPreset = (category: PrimaryCategoryCode | undefined): CategoryPreset => {
  if (!category || !categoryPresets[category]) {
    // デフォルトプリセット（fashion設定をベースに汎用化）
    return {
      ...categoryPresets.fashion,
      category: 'fashion',
      name: '汎用設定',
      description: 'カテゴリ未選択時のデフォルト設定',
      aiSettings: {
        ...categoryPresets.fashion.aiSettings,
        backgroundRemoval: {
          enabled: true,
          strength: 'medium',
        },
        bannerDesign: {
          colorScheme: 'minimal',
          layout: 'balanced',
          typography: 'modern',
        },
      },
    };
  }
  
  return categoryPresets[category];
};

// UI表示用のプリセット概要
export const getPresetSummary = (category: PrimaryCategoryCode | undefined): string => {
  const preset = getCategoryPreset(category);
  const features: string[] = [];
  
  if (preset.aiSettings.backgroundRemoval.enabled) {
    features.push(`背景処理: ${preset.aiSettings.backgroundRemoval.strength}`);
  }
  
  if (preset.aiSettings.imageEnhancement.wrinkleReduction) {
    features.push('しわ軽減');
  }
  
  if (preset.aiSettings.specialFeatures.vehicleDetection) {
    features.push('車種判別');
  }
  
  if (preset.aiSettings.specialFeatures.fittingSimulation) {
    features.push('装着シミュレーション');
  }
  
  if (preset.aiSettings.specialFeatures.seasonalThemes) {
    features.push('季節テーマ');
  }
  
  return features.length > 0 ? features.join(' • ') : '基本機能';
};

// 設定データの型定義
interface AppSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundRemoval?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageEnhancement?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bannerDesign?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specialFeatures?: any;
  appliedPreset?: {
    category: string;
    name: string;
    appliedAt: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// 設定適用ヘルパー関数
export const applyPresetToSettings = (category: PrimaryCategoryCode | undefined, currentSettings: AppSettings): AppSettings => {
  const preset = getCategoryPreset(category);
  
  return {
    ...currentSettings,
    // AI設定を上書き
    backgroundRemoval: preset.aiSettings.backgroundRemoval,
    imageEnhancement: preset.aiSettings.imageEnhancement,
    bannerDesign: preset.aiSettings.bannerDesign,
    specialFeatures: preset.aiSettings.specialFeatures,
    // メタデータ
    appliedPreset: {
      category: preset.category,
      name: preset.name,
      appliedAt: new Date().toISOString(),
    },
  };
};

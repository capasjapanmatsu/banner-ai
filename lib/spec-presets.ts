import { PresetConfig, BannerSpec } from "@/types/banner";

export const PRESET_CONFIGS: PresetConfig[] = [
  {
    platform: "rakuten",
    name: "楽天 (800x800)",
    size: { w: 800, h: 800 },
    maxBytes: 500 * 1024, // 500KB
  },
  {
    platform: "yahoo",
    name: "ヤフーショッピング (1200x1200)",
    size: { w: 1200, h: 1200 },
    maxBytes: 1000 * 1024, // 1MB
  },
  {
    platform: "custom",
    name: "自社サイト (1200x628)",
    size: { w: 1200, h: 628 },
    maxBytes: 500 * 1024, // 500KB
  },
];

export function createDefaultSpec(config: PresetConfig): BannerSpec {
  return {
    meta: {
      platform: config.platform,
      size: config.size,
    },
    palette: {
      bg: "#ffffff",
      primary: "#333333",
      accent: "#ff6b35",
    },
    layers: [
      {
        id: "bg",
        type: "bg",
        x: 0,
        y: 0,
        color: "#ffffff",
      },
      {
        id: "headline",
        type: "text",
        text: "メインタイトル",
        x: 40,
        y: 80,
        maxW: config.size.w - 80,
        style: {
          font: "Noto Sans JP",
          weight: "bold",
          size: Math.min(48, config.size.w / 16),
          fill: "#333333",
        },
      },
      {
        id: "subtitle",
        type: "text",
        text: "サブタイトルテキスト",
        x: 40,
        y: 140,
        maxW: config.size.w - 80,
        style: {
          font: "Noto Sans JP",
          weight: "normal",
          size: Math.min(24, config.size.w / 24),
          fill: "#666666",
        },
      },
      {
        id: "cta",
        type: "cta",
        text: "今すぐ購入",
        x: config.size.w - 200,
        y: config.size.h - 80,
        w: 160,
        h: 50,
        style: {
          bg: "#ff6b35",
          fill: "#ffffff",
          font: "Noto Sans JP",
          weight: "bold",
          size: 18,
          radius: 8,
        },
      },
    ],
    export: {
      format: "png",
      quality: 0.9,
      maxBytes: config.maxBytes,
    },
  };
}

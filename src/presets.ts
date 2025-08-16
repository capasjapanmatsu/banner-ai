export const presets: Record<string, { size: string; safeMargin?: number }> = {
  r10_product: { size: "1200x1200", safeMargin: 48 }, // 楽天 商品画像スクエア
  r10_wide: { size: "1200x630", safeMargin: 40 }, // 楽天横長想定
  yss_banner: { size: "1200x628", safeMargin: 40 }, // Yahoo! ストアバナー
  square1080: { size: "1080x1080", safeMargin: 48 },
};

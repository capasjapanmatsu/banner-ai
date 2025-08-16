import { createCanvas, loadImage } from "@napi-rs/canvas";

export type AnyLayer = any;

/**
 * ざっくりルール
 * - タイトルが2行以上 → フォントを少し縮め、バッジ/価格を下げる
 * - タイトルが短文（<=10文字） → 少し大きく
 * - 商品画像が「縦長」→ 画像エリアをやや背伸び、「横長」→ やや低く
 */
export async function autoAdaptLayers(params: {
  layers: AnyLayer[];
  size: { w: number; h: number };
  titleText?: string;
}): Promise<AnyLayer[]> {
  const { layers, size, titleText } = params;
  const out = layers.map((l: AnyLayer) => ({ ...l }));

  // 1) タイトル推定
  let titleIdx = out.findIndex((l) => l?.type === "text" && (l.text === titleText));
  if (titleIdx === -1) {
    const texts = out.filter((l) => l?.type === "text");
    if (texts.length) {
      const maxF = Math.max(...texts.map((t: any) => t.fontSize || 0));
      titleIdx = out.findIndex((l) => l?.type === "text" && l.fontSize === maxF);
    }
  }
  const title = titleIdx >= 0 ? out[titleIdx] : null;
  const safe = 36;

  if (title && typeof title.text === "string") {
    const lines = title.text.split("\n").length;
    if (lines >= 2) {
      title.fontSize = Math.floor(title.fontSize * 0.92);
      const bump = Math.floor(title.fontSize * 0.28);
      for (const l of out) {
        if (l === title) continue;
        if (l.type === "badge" || (l.type === "text" && typeof l.text === "string" && /¥|円|価格/.test(l.text))) {
          l.y = Math.min(l.y + bump, size.h - safe * 1.5);
        }
      }
    } else if ((title.text.replace(/\s/g, "")).length <= 10) {
      title.fontSize = Math.floor(title.fontSize * 1.06);
    }
  }

  // 2) 商品画像の縦横比を見てエリア微調整
  const img = out.find((l) => l?.type === "image" && l.src);
  if (img) {
    try {
      const im = await loadImage(img.src);
      const ar = im.width / im.height; // >1 横長, <1 縦長
      const cx = img.x + img.w / 2, cy = img.y + img.h / 2;
      if (ar < 0.9) {
        // 縦長 → 少し縦を伸ばす／横を少し絞る
        img.h = Math.min(img.h * 1.08, size.h - safe * 2);
        img.w = Math.max(img.w * 0.95, 80);
      } else if (ar > 1.3) {
        // 横長 → 少し縦を低く
        img.h = Math.max(img.h * 0.92, 80);
      }
      // 中心は維持
      img.x = cx - img.w / 2;
      img.y = cy - img.h / 2;
    } catch {
      /* 無視（画像が未読込でも続行） */
    }
  }

  return out;
}

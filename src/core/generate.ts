import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import tinycolor from "tinycolor2";
import { ProfileSchema, type Profile } from "../types";
import { TEMPLATES } from "../templates/index";
import { removeBackgroundIfEnabled, addAlphaOutline } from "./bgremove";
import { drawEllipseShadow, drawFloorReflection } from "./effects";
import { applyTweaks } from "./tweaks";
import { smartTitle } from "./text";
import { selectBestFont, getFontConfig, initializeFonts } from "./fonts";
import { autoAdaptLayers } from "./autolayout";
import { colorFitImage, type ColorFitMode } from "./colorfit";

export type GenerateOptions = {
  template: string;
  profilePath: string;
  outPath?: string;
  size: { w: number; h: number };
  payload: Record<string, any>; // title/price/discount/badge/period/variants...
  notes?: string[]; // フッタ注記
  colorsOverride?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
  }; // ← 追加
  tenantId?: string; // ← 追加
  metaSidecar?: Record<string, any>; // ← 追加（出力PNGと同名の .json を保存）
};

function ensureContrast(bg: string, fg: string): string {
  const contrastToBlack = tinycolor.readability(bg, "#000");
  const contrastToWhite = tinycolor.readability(bg, "#fff");
  const best = contrastToBlack > contrastToWhite ? "#000000" : "#ffffff";
  const current = tinycolor.readability(bg, fg);
  if (current < 4.5) return best;
  return fg;
}

type Layer =
  | { type: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | {
      type: "text";
      text: string;
      x: number;
      y: number;
      maxWidth: number;
      fontWeight: number;
      fontSize: number;
      fill: string;
    }
  | {
      type: "badge";
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
      textFill: string;
    }
  | {
      type: "image";
      src: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fit?: "contain" | "cover";
      radius?: number;
      removeBg?: boolean;
      shadow?: "none" | "ellipse" | "floor";
      shadowOpacity?: number;
      shadowOffsetY?: number;
      colorFit?: { mode: ColorFitMode; strength?: number; brandHex?: string };
      outline?: { widthPx?: number; color?: string; opacity?: number };
    };

function loadProfile(pth: string): Profile {
  const raw = fs.readFileSync(path.resolve(pth), "utf-8");
  const parsed = ProfileSchema.parse(JSON.parse(raw));
  if (parsed.font?.path) {
    const fp = path.resolve(parsed.font.path);
    if (fs.existsSync(fp)) GlobalFonts.registerFromPath(fp, parsed.font.family);
  }
  return parsed;
}

async function drawLayers(
  ctx: any,
  profile: Profile,
  layers: Layer[],
  size: { w: number; h: number }
) {
  const colorMap: Record<string, string> = {
    primary: profile.colors.primary,
    secondary: profile.colors.secondary ?? "#ffffff",
    accent: profile.colors.accent ?? "#FFD93D",
    text: profile.colors.text ?? "#111111",
  };

  // 学習パラメータ適用
  const fontScale = (profile as any).fontScale ?? 1.0;
  const saturation = (profile as any).saturation ?? 1.0;

  // 彩度調整
  Object.keys(colorMap).forEach((key) => {
    if (colorMap[key]) {
      colorMap[key] = tinycolor(colorMap[key])
        .saturate((saturation - 1) * 50)
        .toHexString();
    }
  });

  const safe = (profile as any).safeMargin ?? 36;

  for (const layer of layers) {
    if (layer.type === "rect") {
      ctx.fillStyle = colorMap[layer.fill] ?? layer.fill;
      ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
    } else if (layer.type === "text") {
      const fillColor = ensureContrast(
        colorMap.primary,
        colorMap[layer.fill] ?? layer.fill
      );
      ctx.fillStyle = fillColor;

      // フォントフェールバック適用
      const fontConfig = getFontConfig("japanese");
      const bestFont = selectBestFont(fontConfig);

      const adjustedFontSize = Math.floor(layer.fontSize * fontScale);
      ctx.font = `${layer.fontWeight} ${adjustedFontSize}px "${bestFont}"`;
      ctx.textBaseline = "top";

      const x = Math.max(layer.x, safe);
      const y = Math.max(layer.y, safe);
      const maxW = Math.min(layer.maxWidth, size.w - safe * 2);

      // スマートタイトル処理（改行最適化）
      const maxLines = Math.floor(
        (size.h - y - safe) / (adjustedFontSize * 1.2)
      );
      const smartText = smartTitle(layer.text, {
        maxChars: Math.floor(maxW / (adjustedFontSize * 0.6)), // 大まかな文字数推定
        maxLines: Math.max(1, maxLines),
        preferBreak: ["、", "・", "／", "/", "｜", "|", "-", " "],
      });

      // 改行分割して描画
      const lines = smartText.split("\n");
      let drawY = y;

      for (const line of lines) {
        if (drawY + adjustedFontSize > size.h - safe) break; // 画面外回避
        ctx.fillText(line, x, drawY);
        drawY += adjustedFontSize * 1.2;
      }
    } else if (layer.type === "badge") {
      ctx.fillStyle = colorMap[layer.fill] ?? layer.fill;
      const r = Math.min(layer.h, layer.w) * 0.25;
      const x = Math.max(layer.x, safe);
      const y = Math.max(layer.y, safe);
      const w = Math.min(layer.w, size.w - safe * 2);
      const h = Math.min(layer.h, size.h - safe * 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
      const textColor = ensureContrast(
        colorMap[layer.fill] ?? "#ffffff",
        colorMap[layer.textFill] ?? "#000000"
      );
      ctx.fillStyle = textColor;
      const fontSize = Math.floor(h * 0.5 * fontScale);
      ctx.font = `800 ${fontSize}px "${profile.font.family}"`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(layer.text, x + w / 2, y + h / 2);
      ctx.textAlign = "start";
    } else if (layer.type === "image") {
      const x = Math.max(layer.x, safe);
      const y = Math.max(layer.y, safe);
      const w = Math.min(layer.w, size.w - safe * 2);
      const h = Math.min(layer.h, size.h - safe * 2);

      // 背景除去・カラー整合処理
      let srcPath = layer.src;
      const brandHex = colorMap.primary || "#D92C2C";

      if (layer.removeBg) {
        srcPath = await removeBackgroundIfEnabled(srcPath);
      }
      if (layer.colorFit) {
        srcPath = await colorFitImage({
          src: srcPath,
          mode: layer.colorFit.mode,
          strength: layer.colorFit.strength ?? 1,
          brandHex: layer.colorFit.brandHex || brandHex,
        });
      }
      if (layer.outline) {
        srcPath = await addAlphaOutline(srcPath, layer.outline);
      }

      const img = await loadImage(srcPath);

      // contain / cover 計算
      const scaleX = w / img.width,
        scaleY = h / img.height;
      let drawW = w,
        drawH = h;
      if ((layer.fit ?? "contain") === "contain") {
        const s = Math.min(scaleX, scaleY);
        drawW = img.width * s;
        drawH = img.height * s;
      } else {
        const s = Math.max(scaleX, scaleY);
        drawW = img.width * s;
        drawH = img.height * s;
      }
      const dx = x + (w - drawW) / 2;
      const dy = y + (h - drawH) / 2;

      // 影（画像の手前に引く＝先に描く）
      if (layer.shadow && layer.shadow !== "none") {
        const opacity = layer.shadowOpacity ?? 0.35;
        if (layer.shadow === "ellipse") {
          const scy =
            dy + drawH + (layer.shadowOffsetY ?? Math.min(16, h * 0.06));
          drawEllipseShadow(
            ctx,
            dx + drawW / 2,
            scy,
            drawW * 0.8,
            Math.max(12, drawH * 0.12),
            opacity
          );
        } else if (layer.shadow === "floor") {
          drawFloorReflection(
            ctx,
            dx,
            dy + drawH * 0.85,
            drawW,
            drawH * 0.25,
            opacity * 0.7
          );
        }
      }

      // 角丸クリップ
      if (layer.radius && layer.radius > 0) {
        const r = Math.min(layer.radius, Math.min(w, h) / 2);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dx + r, dy);
        ctx.arcTo(dx + drawW, dy, dx + drawW, dy + drawH, r);
        ctx.arcTo(dx + drawW, dy + drawH, dx, dy + drawH, r);
        ctx.arcTo(dx, dy + drawH, dx, dy, r);
        ctx.arcTo(dx, dy, dx + drawW, dy, r);
        ctx.closePath();
        ctx.clip();
      }

      ctx.drawImage(img, dx, dy, drawW, drawH);
      if (layer.radius && layer.radius > 0) ctx.restore();
    }
  }
}

export async function generateBanner(opts: GenerateOptions) {
  // フォントシステム初期化
  try {
    initializeFonts();
  } catch (error) {
    console.warn("Font initialization failed:", error);
  }

  const profile = loadProfile(opts.profilePath);

  // 暗すぎる基調色は少し明るく
  const base = tinycolor(profile.colors.primary);
  if (base.getBrightness() < 30)
    profile.colors.primary = base.lighten(10).toHexString();

  // 色上書き反映
  if (opts.colorsOverride) {
    profile.colors = { ...profile.colors, ...opts.colorsOverride };
  }

  const canvas = createCanvas(opts.size.w, opts.size.h);
  const ctx = canvas.getContext("2d");

  const templateLoader = TEMPLATES[opts.template];
  if (!templateLoader) throw new Error(`Unknown template: ${opts.template}`);

  const tpl = await templateLoader();
  const bannerInput = {
    title: opts.payload.title || "",
    price: opts.payload.price,
    discount: opts.payload.discount,
    badge: opts.payload.badge,
    period: opts.payload.period,
    variants: opts.payload.variants,
    items: opts.payload.items, // カタログ用
    size: opts.size,
  };
  const layout = tpl(bannerInput);

  // テナント別の微調整を適用
  const adjusted = applyTweaks({
    layers: layout.layers as any[],
    templateId: opts.template,
    tenantId: opts.tenantId,
    profile,
  });
  const layersAfterTweaks = adjusted.layers;
  const profileToUse = adjusted.profile;

  // ★ 自動レイアウト適応をここで実行（タイトル・画像比を見て微調整）
  const adapted = await autoAdaptLayers({
    layers: layersAfterTweaks as any[],
    size: opts.size,
    titleText: (opts.payload as any)?.title
  });

  await drawLayers(ctx, profileToUse, adapted as Layer[], opts.size);

  // フッタ注記（notes）
  const notes = opts.notes ?? [];
  if (notes.length) {
    const safe = (profileToUse as any).safeMargin ?? 36;
    const text = notes.join("／");
    ctx.fillStyle = "#000000";
    ctx.font = `400 ${Math.floor(opts.size.w * 0.028)}px "${
      profileToUse.font.family
    }"`;
    ctx.textBaseline = "bottom";
    ctx.globalAlpha = 0.8;
    ctx.fillText(text, safe, opts.size.h - safe * 0.6, opts.size.w - safe * 2);
    ctx.globalAlpha = 1;
  }

  const outDir = opts.outPath
    ? path.dirname(opts.outPath)
    : path.resolve("./out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file =
    opts.outPath ??
    path.join(
      outDir,
      `banner_${opts.template}_${opts.size.w}x${opts.size.h}.png`
    );
  // 画像を書き出し
  fs.writeFileSync(file, canvas.toBuffer("image/png"));

  // サイドカー（任意）
  if (opts.metaSidecar) {
    const side = file.replace(/\.png$/i, ".json");
    fs.writeFileSync(side, JSON.stringify(opts.metaSidecar, null, 2), "utf-8");
  }

  return file;
}

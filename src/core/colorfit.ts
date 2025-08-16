import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import ColorThief from "colorthief";
import tinycolor from "tinycolor2";

export type ColorFitMode = "brand-align" | "pop" | "soft";

function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}
function toHex(rgb: number[]) {
  return tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHexString();
}

async function dominantHue(file: string) {
  try {
    const colorThief = new ColorThief();
    const pal = await colorThief.getPalette(file, 5);
    const hex = toHex(pal[0]);
    return tinycolor(hex).toHsl().h; // 0-360
  } catch (error) {
    console.warn("Failed to extract dominant hue:", error);
    return 0;
  }
}

/** 画像を一時変換して保存し、そのパスを返す（キャッシュ付き） */
export async function colorFitImage(params: {
  src: string;
  brandHex?: string;
  mode: ColorFitMode;
  strength?: number;
  cacheDir?: string;
}) {
  const {
    src,
    brandHex = "#D92C2C",
    mode,
    strength = 1,
    cacheDir = "./uploads/cache",
  } = params;
  await fs.ensureDir(cacheDir);
  const key = sha1([src, brandHex, mode, strength].join("|")).slice(0, 12);
  const out = path.resolve(cacheDir, `cf_${key}.png`);
  if (await fs.pathExists(out)) return out;

  const img = sharp(src).png();
  const meta = await img.metadata();
  let pipeline = img;

  if (mode === "brand-align") {
    // 支配色の色相をブランド色へ寄せる（回転）
    const dh = (async () => {
      try {
        const hSrc = await dominantHue(src);
        const hBrand = tinycolor(brandHex).toHsl().h;
        let delta = hBrand - hSrc;
        // -180..+180 に正規化
        delta = ((delta + 540) % 360) - 180;
        // 強さを制限（過度な変化はNG）±24°まで
        delta = Math.max(-24, Math.min(24, delta)) * strength;
        return delta;
      } catch {
        return 0;
      }
    })();
    const hue = await dh;
    pipeline = pipeline.modulate({ hue });
    // 彩度をわずかに整える
    pipeline = pipeline.modulate({ saturation: 1 + 0.05 * strength });
  } else if (mode === "pop") {
    pipeline = pipeline.modulate({
      saturation: 1.15 * strength,
      brightness: 1.03,
    });
  } else if (mode === "soft") {
    pipeline = pipeline.modulate({ saturation: 0.88, brightness: 1.0 });
  }

  await pipeline.toFile(out);
  return out;
}

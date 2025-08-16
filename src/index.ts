import { Command } from "commander";
import { generateBanner } from "./core/generate";
import { checkCopyCompliance } from "./compliance";
import { presets } from "./presets";
import type { Market } from "./compliance-dicts";
import { pickHarmoniousColors, type HarmonyMode } from "./core/palette";
import { applyTerms, unprotectKeepMarkers } from "./core/terms";
import { smartTitle } from "./core/text";
import path from "node:path";
import fs from "node:fs";

const program = new Command();
program
  .option("--template <id>", "template id", "basic-sale")
  .option(
    "--profile <path>",
    "profile json path",
    "./data/profiles/sample.json"
  )
  .option("--title <text>", "title", "夏の大感謝祭")
  .option("--price <text>", "price")
  .option("--discount <text>", "discount")
  .option("--badge <text>", "badge text")
  .option("--period <text>", "period text (e.g. 8/18-8/20)")
  .option("--variants <csv>", "comma separated (e.g. S,M,L,XL)")
  .option("--image <path>", "product image path (png/jpg)")
  .option("--fit <mode>", "contain|cover", "contain")
  .option("--market <id>", "generic|r10|yss", "generic")
  .option("--size <WxH>", "e.g., 1080x1080", "1080x1080")
  .option("--preset <id>", "size preset id (e.g., r10_product)")
  .option("--evidence <text>", "根拠の注記")
  .option(
    "--palette <mode>",
    "brand|auto-analogous|auto-complementary|auto-soft"
  )
  .option("--tenant <id>", "tenant id", "demo")
  .parse(process.argv);

const opt = program.opts<{
  template: string;
  profile: string;
  title: string;
  price?: string;
  discount?: string;
  badge?: string;
  period?: string;
  variants?: string;
  size: string;
  preset?: string;
  evidence?: string;
  image?: string;
  fit?: "contain" | "cover";
  market: Market;
  palette?: HarmonyMode;
  tenant?: string;
}>();

function parseSize(s: string) {
  const [w, h] = s.split("x").map(Number);
  if (!w || !h) throw new Error("size must be like 1080x1080");
  return { w, h };
}

(async () => {
  let size = parseSize(opt.size);
  if (opt.preset && presets[opt.preset]) {
    const [w, h] = presets[opt.preset].size.split("x").map(Number);
    size = { w, h };
  }

  // 辞書適用 → コンプライアンスチェック → タイトル要約
  const preProcessed = applyTerms(opt.tenant || "demo", opt.title);
  const compliance = checkCopyCompliance(
    preProcessed,
    opt.market,
    opt.evidence
  );
  if (compliance.warnings.length) console.log(compliance.warnings.join("\n"));

  // タイトル要約（オプション追加を想定）
  let titleOut = compliance.title;
  const titleSummarize = true; // デフォルトで有効
  const titleMax = 24; // 最大文字数
  const titleLines = 2; // 最大行数

  if (titleSummarize) {
    titleOut = smartTitle(compliance.title, {
      maxChars: titleMax,
      maxLines: titleLines,
    });
  }
  titleOut = unprotectKeepMarkers(titleOut);

  // パレット色生成（画像がある場合のみ）
  let colorsOverride: any = undefined;
  if (opt.palette && opt.image) {
    try {
      const profileData = JSON.parse(fs.readFileSync(opt.profile, "utf-8"));
      colorsOverride = await pickHarmoniousColors({
        imagePath: opt.image,
        profilePrimary: profileData.colors?.primary || "#D92C2C",
        mode: opt.palette,
      });
    } catch (e) {
      console.warn("Failed to generate palette:", (e as any).message);
    }
  }

  const out = await generateBanner({
    template: opt.template,
    profilePath: opt.profile,
    size,
    payload: {
      title: titleOut,
      price: opt.price,
      discount: opt.discount,
      badge: opt.badge,
      period: opt.period,
      variants: opt.variants
        ? opt.variants.split(",").map((s) => s.trim())
        : undefined,
      image: opt.image,
      fit: opt.fit,
    },
    notes: compliance.notes,
    colorsOverride,
    tenantId: opt.tenant,
  });

  console.log(`✅ Exported: ${path.resolve(out)}`);
})();

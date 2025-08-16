import fs from "node:fs";
import path from "node:path";

type FeedbackTag =
  | "文字大きめ"
  | "文字小さめ"
  | "上品に"
  | "目立たせる"
  | "余白広め"
  | "余白詰める";

const rules: Record<FeedbackTag, (p: any) => any> = {
  文字大きめ: (p) => ({
    ...p,
    fontScale: Math.min((p.fontScale ?? 1) + 0.05, 1.5),
  }),
  文字小さめ: (p) => ({
    ...p,
    fontScale: Math.max((p.fontScale ?? 1) - 0.05, 0.7),
  }),
  上品に: (p) => ({
    ...p,
    saturation: Math.max((p.saturation ?? 1) - 0.1, 0.6),
  }),
  目立たせる: (p) => ({
    ...p,
    saturation: Math.min((p.saturation ?? 1) + 0.1, 1.4),
  }),
  余白広め: (p) => ({
    ...p,
    safeMargin: Math.min((p.safeMargin ?? 48) + 8, 120),
  }),
  余白詰める: (p) => ({
    ...p,
    safeMargin: Math.max((p.safeMargin ?? 48) - 8, 16),
  }),
};

const [profilePath, tag] = process.argv.slice(2);
if (!profilePath || !tag || !(tag in rules)) {
  console.log(
    "Usage: tsx src/tools/feedback.ts <profileJson> <タグ: 文字大きめ|文字小さめ|上品に|目立たせる|余白広め|余白詰める>"
  );
  console.log("Available tags:", Object.keys(rules).join(", "));
  process.exit(1);
}

try {
  const abs = path.resolve(profilePath);
  if (!fs.existsSync(abs)) {
    console.error(`❌ Profile file not found: ${abs}`);
    process.exit(1);
  }

  const p = JSON.parse(fs.readFileSync(abs, "utf-8"));
  const updated = rules[tag as FeedbackTag](p);
  fs.writeFileSync(abs, JSON.stringify(updated, null, 2), "utf-8");
  console.log(`✅ Updated profile with tag "${tag}"`);
  console.log(
    `Updated values: fontScale=${updated.fontScale}, saturation=${updated.saturation}, safeMargin=${updated.safeMargin}`
  );
} catch (error) {
  console.error(`❌ Error updating profile: ${error}`);
  process.exit(1);
}

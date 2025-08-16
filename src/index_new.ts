import { Command } from "commander";
import { generateBanner } from "./core/generate";
import { checkCopyCompliance } from "./compliance";
import { presets } from "./presets";
import path from "node:path";

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
  .option("--size <WxH>", "e.g., 1080x1080", "1080x1080")
  .option("--preset <id>", "size preset id (e.g., r10_product)")
  .option("--evidence <text>", "根拠の注記（No.1等の裏付け）")
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
}>();

function parseSize(s: string) {
  const [w, h] = s.split("x").map(Number);
  if (!w || !h) throw new Error("size must be like 1080x1080");
  return { w, h };
}

(async () => {
  let size = parseSize(opt.size);
  let profilePath = opt.profile;

  // プリセット優先
  if (opt.preset && presets[opt.preset]) {
    size = parseSize(presets[opt.preset].size);
  }

  const compliance = checkCopyCompliance(opt.title, opt.evidence);
  if (compliance.warnings.length) {
    console.log(compliance.warnings.join("\n"));
  }

  const out = await generateBanner({
    template: opt.template,
    profilePath,
    size,
    payload: {
      title: compliance.title,
      price: opt.price,
      discount: opt.discount,
      badge: opt.badge,
      period: opt.period,
      variants: opt.variants
        ? opt.variants.split(",").map((s) => s.trim())
        : undefined,
    },
    notes: compliance.notes,
  });

  console.log(`✅ Exported: ${path.resolve(out)}`);
})();

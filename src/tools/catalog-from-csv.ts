import fs from "fs-extra";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { presets } from "../presets";
import { generateBanner } from "../core/generate";

type Row = { image?: string; title?: string; price?: string; badge?: string };

const [
  ,
  ,
  csvPath,
  outPath = "./out/catalog.png",
  preset = "r10_product",
  profile = "./data/profiles/sample.json",
] = process.argv;
if (!csvPath) {
  console.log(
    "Usage: tsx src/tools/catalog-from-csv.ts <csvPath> [outPath] [preset] [profileJson]"
  );
  process.exit(1);
}

(async () => {
  const csv = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Row[];
  const items = rows.slice(0, 8); // 最大8件
  const [w, h] = (presets[preset]?.size || "1200x1200").split("x").map(Number);

  const file = await generateBanner({
    template: "catalog-grid",
    profilePath: profile,
    size: { w, h },
    payload: { items },
    notes: [],
    outPath,
  });
  console.log(`✅ Exported: ${path.resolve(file)}`);
})();

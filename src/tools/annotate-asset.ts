import fs from "fs-extra";
import path from "node:path";
import { fingerprint } from "../core/assetmeta";

const [, , filePath, key, value] = process.argv;
if (!filePath || !key) {
  console.log(
    "Usage: tsx src/tools/annotate-asset.ts <filePath> <key> [value]"
  );
  process.exit(1);
}

(async () => {
  const LIB_INDEX = path.resolve("src/assets/library/index.json");
  const idx = (await fs.pathExists(LIB_INDEX))
    ? await fs.readJSON(LIB_INDEX)
    : {};
  const abs = path.resolve(filePath);
  const hash = await fingerprint(abs);

  idx[hash] = idx[hash] || {
    hash,
    path: abs.replace(/\\/g, "/"),
    addedAt: new Date().toISOString(),
  };
  idx[hash].meta = idx[hash].meta || {};
  (idx[hash].meta as any)[key] = value ?? true;

  await fs.writeJSON(LIB_INDEX, idx, { spaces: 2 });
  console.log(`✅ annotated ${hash} -> ${key}=${value}`);
})();

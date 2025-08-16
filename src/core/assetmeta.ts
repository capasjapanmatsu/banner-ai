import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";

const LIB_INDEX = path.resolve("src/assets/library/index.json");

export type AssetMeta = {
  sourceUrl?: string;
  owner?: string;
  license?: "commercial-ok" | "editorial" | "restricted" | "unknown";
  expiresAt?: string; // 期限（あれば）
  allowedMarkets?: string[]; // ["r10","yss"] 等
  note?: string;
};

function sha1(buf: Buffer) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

export async function fingerprint(file: string) {
  const buf = await fs.readFile(file);
  return sha1(buf);
}

export async function lookupLibraryByFile(
  file: string
): Promise<AssetMeta | null> {
  if (!(await fs.pathExists(LIB_INDEX))) return null;
  const idx = await fs.readJSON(LIB_INDEX);
  const fp = await fingerprint(file);
  const row = idx[fp];
  if (!row) return null;
  return row.meta || null;
}

export function checkRights(meta: AssetMeta | null, market: string) {
  const warnings: string[] = [];
  const notes: string[] = [];

  if (!meta) {
    warnings.push("ℹ 素材の出典・権利情報が未登録です。");
    notes.push("※素材の出典・権利者・ライセンスを記録してください。");
    return { warnings, notes };
  }

  if (meta.license === "restricted") {
    warnings.push("⚠ ライセンスが制限付きです。用途や媒体に注意。");
  }
  if (meta.license === "editorial") {
    warnings.push("⚠ エディトリアル専用素材です。商用利用不可の可能性。");
  }
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    warnings.push("⚠ ライセンス期限切れの可能性があります。");
  }
  if (meta.allowedMarkets && !meta.allowedMarkets.includes(market)) {
    warnings.push(`⚠ この市場（${market}）では未許可の可能性があります。`);
  }

  // 注記（必要に応じて画像のフッタへ）
  if (meta.sourceUrl) notes.push(`※素材出典: ${meta.sourceUrl}`);
  if (meta.owner) notes.push(`© ${meta.owner}`);
  if (meta.note) notes.push(meta.note);

  return { warnings, notes };
}

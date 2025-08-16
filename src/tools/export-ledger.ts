#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createObjectCsvWriter } from "csv-writer";

/**
 * サイドカー台帳CSV出力
 * - out/ フォルダ内の .meta.json ファイルをスキャン
 * - 権利情報、ライセンス、使用許諾をCSV形式で出力
 */

interface MetaRecord {
  id: string;
  tenantId: string;
  market: string;
  template: string;
  profile: string;
  title: string;
  createdAt: string;
  imageSource?: string;
  rightsHolder?: string;
  license?: string;
  attribution?: string;
  commercialUse?: boolean;
  usageNotes?: string;
  outputPath?: string;
  fileSize?: number;
  dimensions?: string;
}

async function exportLedger(outputFile = "./asset-ledger.csv"): Promise<void> {
  const outDir = "./out";
  const records: MetaRecord[] = [];

  if (!fs.existsSync(outDir)) {
    console.log("out/ directory not found. No assets to export.");
    return;
  }

  // .meta.json ファイルをスキャン
  const files = fs.readdirSync(outDir, { recursive: true });

  for (const file of files) {
    if (typeof file === "string" && file.endsWith(".meta.json")) {
      const metaPath = path.join(outDir, file);

      try {
        const metaData = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const record: MetaRecord = {
          id: metaData.id || "unknown",
          tenantId: metaData.tenantId || "default",
          market: metaData.market || "generic",
          template: metaData.template || "unknown",
          profile: metaData.profile || "unknown",
          title: metaData.title || "untitled",
          createdAt: metaData.createdAt || new Date().toISOString(),
          imageSource: metaData.rights?.source || "",
          rightsHolder: metaData.rights?.holder || "",
          license: metaData.rights?.license || "",
          attribution: metaData.rights?.attribution || "",
          commercialUse: metaData.rights?.commercialUse ?? true,
          usageNotes: metaData.rights?.notes || "",
          outputPath: file.replace(".meta.json", ".png"),
          fileSize: 0,
          dimensions: "",
        };

        // 実際のPNGファイルの情報を取得
        const pngPath = path.join(outDir, record.outputPath || "");
        if (fs.existsSync(pngPath)) {
          const stats = fs.statSync(pngPath);
          record.fileSize = stats.size;

          // 画像サイズを取得（簡易版）
          try {
            const sharp = await import("sharp");
            const metadata = await sharp.default(pngPath).metadata();
            record.dimensions = `${metadata.width}x${metadata.height}`;
          } catch (e) {
            record.dimensions = "unknown";
          }
        }

        records.push(record);
      } catch (e) {
        console.warn(`Failed to parse ${metaPath}:`, e);
      }
    }
  }

  if (records.length === 0) {
    console.log("No metadata files found.");
    return;
  }

  // CSV出力
  const csvWriter = createObjectCsvWriter({
    path: outputFile,
    header: [
      { id: "id", title: "ID" },
      { id: "tenantId", title: "テナントID" },
      { id: "market", title: "マーケット" },
      { id: "template", title: "テンプレート" },
      { id: "profile", title: "プロファイル" },
      { id: "title", title: "タイトル" },
      { id: "createdAt", title: "作成日時" },
      { id: "outputPath", title: "出力ファイル" },
      { id: "fileSize", title: "ファイルサイズ(bytes)" },
      { id: "dimensions", title: "画像サイズ" },
      { id: "imageSource", title: "画像ソース" },
      { id: "rightsHolder", title: "権利者" },
      { id: "license", title: "ライセンス" },
      { id: "attribution", title: "帰属表示" },
      { id: "commercialUse", title: "商用利用可" },
      { id: "usageNotes", title: "使用許諾備考" },
    ],
  });

  await csvWriter.writeRecords(records);
  console.log(
    `✅ Asset ledger exported: ${outputFile} (${records.length} records)`
  );
}

// CLI実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputFile = process.argv[2] || "./asset-ledger.csv";
  exportLedger(outputFile).catch(console.error);
}

export { exportLedger };

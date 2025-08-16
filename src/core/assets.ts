import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import fg from "fast-glob";
import sizeOf from "image-size";

export type AssetInfo = {
  path: string;
  hash: string;
  size: { width: number; height: number };
  fileSize: number;
  ext: string;
  basename: string;
};

export type DuplicateGroup = {
  hash: string;
  count: number;
  totalSize: number;
  files: AssetInfo[];
  recommended: AssetInfo; // 残すべきファイル
};

// ファイルハッシュ計算
async function calculateHash(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("md5").update(buffer).digest("hex");
}

// 画像情報取得
async function getImageInfo(filePath: string): Promise<AssetInfo | null> {
  try {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    const dimensions = sizeOf(buffer);
    const hash = await calculateHash(filePath);

    if (!dimensions.width || !dimensions.height) {
      return null;
    }

    return {
      path: filePath,
      hash,
      size: { width: dimensions.width, height: dimensions.height },
      fileSize: stats.size,
      ext: path.extname(filePath).toLowerCase(),
      basename: path.basename(filePath, path.extname(filePath)),
    };
  } catch (error) {
    console.warn(`⚠️ Failed to analyze: ${filePath}`, error);
    return null;
  }
}

// アセットディレクトリをスキャン
export async function scanAssets(
  assetDirs: string[] = ["./src/assets", "./public"]
): Promise<AssetInfo[]> {
  const imageExts = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tiff",
    ".svg",
  ];
  const assets: AssetInfo[] = [];

  console.log("🔍 Scanning asset directories...");

  for (const dir of assetDirs) {
    if (!(await fs.pathExists(dir))) {
      console.log(`📁 Directory not found: ${dir}`);
      continue;
    }

    const patterns = imageExts.map((ext) => path.join(dir, `**/*${ext}`));
    const files = await fg(patterns, { onlyFiles: true });

    console.log(`📂 ${dir}: Found ${files.length} image files`);

    for (const file of files) {
      const info = await getImageInfo(file);
      if (info) {
        assets.push(info);
      }
    }
  }

  console.log(`✅ Total scanned: ${assets.length} valid images`);
  return assets;
}

// 重複検知
export function findDuplicates(assets: AssetInfo[]): DuplicateGroup[] {
  const hashGroups = new Map<string, AssetInfo[]>();

  // ハッシュでグループ化
  for (const asset of assets) {
    if (!hashGroups.has(asset.hash)) {
      hashGroups.set(asset.hash, []);
    }
    hashGroups.get(asset.hash)!.push(asset);
  }

  // 重複のみ抽出
  const duplicates: DuplicateGroup[] = [];

  for (const [hash, files] of hashGroups) {
    if (files.length > 1) {
      // 最適なファイル選択（優先順位: 短いパス > 高解像度 > 小ファイルサイズ）
      const recommended = files.reduce((best, current) => {
        // パスの深さ比較
        const bestDepth = best.path.split(/[/\\]/).length;
        const currentDepth = current.path.split(/[/\\]/).length;

        if (currentDepth < bestDepth) return current;
        if (currentDepth > bestDepth) return best;

        // 解像度比較
        const bestPixels = best.size.width * best.size.height;
        const currentPixels = current.size.width * current.size.height;

        if (currentPixels > bestPixels) return current;
        if (currentPixels < bestPixels) return best;

        // ファイルサイズ比較（小さい方を優先）
        return current.fileSize < best.fileSize ? current : best;
      });

      duplicates.push({
        hash,
        count: files.length,
        totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
        files,
        recommended,
      });
    }
  }

  return duplicates.sort((a, b) => b.totalSize - a.totalSize);
}

// 重複ファイル削除
export async function removeDuplicates(
  duplicates: DuplicateGroup[],
  dryRun = true
): Promise<{
  removed: string[];
  savedBytes: number;
  errors: string[];
}> {
  const removed: string[] = [];
  const errors: string[] = [];
  let savedBytes = 0;

  console.log(`🗑️  ${dryRun ? "DRY RUN" : "REMOVING"} duplicate files...`);

  for (const group of duplicates) {
    const toRemove = group.files.filter(
      (f) => f.path !== group.recommended.path
    );

    for (const file of toRemove) {
      try {
        console.log(
          `${dryRun ? "📋" : "🗑️ "} ${file.path} (${(
            file.fileSize / 1024
          ).toFixed(1)}KB)`
        );

        if (!dryRun) {
          await fs.remove(file.path);
        }

        removed.push(file.path);
        savedBytes += file.fileSize;
      } catch (error) {
        errors.push(`Failed to remove ${file.path}: ${error}`);
      }
    }
  }

  return { removed, savedBytes, errors };
}

// スマートリネーム（一意性保証）
export async function smartRename(
  assets: AssetInfo[],
  targetDir = "./src/assets/library"
): Promise<{
  renamedFiles: Array<{ from: string; to: string }>;
  errors: string[];
}> {
  await fs.ensureDir(targetDir);

  const renamedFiles: Array<{ from: string; to: string }> = [];
  const errors: string[] = [];
  const usedNames = new Set<string>();

  console.log("🏷️  Smart renaming assets...");

  for (const asset of assets) {
    try {
      // 基本名生成
      let baseName = asset.basename
        .toLowerCase()
        .replace(/[^a-z0-9\-_]/g, "-") // 英数字・ハイフン・アンダースコア以外を置換
        .replace(/-+/g, "-") // 連続ハイフンを統合
        .replace(/^-|-$/g, ""); // 先頭末尾のハイフンを削除

      // 空の場合はハッシュ使用
      if (!baseName) {
        baseName = `img-${asset.hash.slice(0, 8)}`;
      }

      // 解像度情報付加
      const resolution = `${asset.size.width}x${asset.size.height}`;
      let newName = `${baseName}_${resolution}${asset.ext}`;

      // 重複回避
      let counter = 1;
      while (usedNames.has(newName)) {
        newName = `${baseName}_${resolution}_${counter}${asset.ext}`;
        counter++;
      }

      usedNames.add(newName);
      const newPath = path.join(targetDir, newName);

      await fs.copy(asset.path, newPath);
      renamedFiles.push({ from: asset.path, to: newPath });

      console.log(`📝 ${path.basename(asset.path)} → ${newName}`);
    } catch (error) {
      errors.push(`Failed to rename ${asset.path}: ${error}`);
    }
  }

  return { renamedFiles, errors };
}

// 統計情報生成
export function generateStats(
  assets: AssetInfo[],
  duplicates: DuplicateGroup[]
): {
  summary: string;
  details: {
    totalFiles: number;
    totalSize: number;
    duplicateGroups: number;
    duplicateFiles: number;
    wastedSpace: number;
    averageSize: number;
    formatBreakdown: Record<string, number>;
    sizeBreakdown: Record<string, number>;
  };
} {
  const totalFiles = assets.length;
  const totalSize = assets.reduce((sum, a) => sum + a.fileSize, 0);
  const duplicateFiles = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);
  const wastedSpace = duplicates.reduce(
    (sum, d) => sum + d.files.slice(1).reduce((s, f) => s + f.fileSize, 0),
    0
  );

  const formatBreakdown: Record<string, number> = {};
  const sizeBreakdown = { small: 0, medium: 0, large: 0 };

  for (const asset of assets) {
    formatBreakdown[asset.ext] = (formatBreakdown[asset.ext] || 0) + 1;

    if (asset.fileSize < 50000) sizeBreakdown.small++;
    else if (asset.fileSize < 500000) sizeBreakdown.medium++;
    else sizeBreakdown.large++;
  }

  const summary = `
📊 Asset Analysis Summary:
• Total files: ${totalFiles}
• Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB
• Duplicate groups: ${duplicates.length}
• Duplicate files: ${duplicateFiles}
• Wasted space: ${(wastedSpace / 1024 / 1024).toFixed(2)} MB (${(
    (wastedSpace / totalSize) *
    100
  ).toFixed(1)}%)
• Average file size: ${(totalSize / totalFiles / 1024).toFixed(1)} KB

🎯 Potential savings: ${(wastedSpace / 1024 / 1024).toFixed(
    2
  )} MB by removing ${duplicateFiles} duplicate files
`;

  return {
    summary,
    details: {
      totalFiles,
      totalSize,
      duplicateGroups: duplicates.length,
      duplicateFiles,
      wastedSpace,
      averageSize: totalSize / totalFiles,
      formatBreakdown,
      sizeBreakdown,
    },
  };
}

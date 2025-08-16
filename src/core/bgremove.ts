import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import tinycolor from "tinycolor2";
const execFileAsync = promisify(execFile);

/**
 * 背景除去の実行モード
 * - process.env.REMBG_MODE = "cli" | "http" | "none"
 *   cli : rembg CLI を呼ぶ（pipでインストールした場合）
 *   http: 外部REST APIにPOSTする（独自APIを用意している場合）
 *   none: 何もしない（デフォルト）
 */
const MODE = (process.env.REMBG_MODE || "none") as "cli" | "http" | "none";
const HTTP_URL = process.env.REMBG_URL || ""; // 例: http://localhost:5000/remove

/**
 * アルファチャンネルのエッジを補正（人/衣類向け改善）
 */
export async function refineAlpha(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    // 1. オリジナル画像を読み込み
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;

    // 2. アルファチャンネルを処理（人/衣類の場合、髪や布の細かい部分を保持）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const alpha = data[idx + 3];

        if (alpha > 0 && alpha < 255) {
          // 半透明領域の処理
          // 周囲のピクセルをチェックして髪や細い繊維の可能性を判定
          const neighbors = getNeighborAlphas(
            data,
            x,
            y,
            width,
            height,
            channels
          );
          const avgAlpha =
            neighbors.reduce((a, b) => a + b, 0) / neighbors.length;

          // 髪の毛や衣類の繊維らしい場合はアルファを強化
          if (isLikelyHairOrFiber(neighbors, alpha)) {
            data[idx + 3] = Math.min(255, alpha * 1.3);
          }
          // ノイズっぽい場合は除去
          else if (isLikelyNoise(neighbors, alpha, avgAlpha)) {
            data[idx + 3] = 0;
          }
          // エッジをスムーズに
          else {
            data[idx + 3] = Math.round(alpha * 0.9 + avgAlpha * 0.1);
          }
        }
      }
    }

    // 3. 結果を保存
    await sharp(data, {
      raw: { width, height, channels },
    })
      .png()
      .toFile(outputPath);
  } catch (error) {
    console.warn("[refineAlpha] Error:", error);
    // エラー時はオリジナルをコピー
    await sharp(inputPath).toFile(outputPath);
  }
}

function getNeighborAlphas(
  data: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
  channels: number
): number[] {
  const neighbors: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * channels;
        neighbors.push(data[idx + 3]);
      }
    }
  }
  return neighbors;
}

function isLikelyHairOrFiber(
  neighbors: number[],
  currentAlpha: number
): boolean {
  // 髪の毛や繊維の特徴：急激なアルファ変化がある
  const variations = neighbors.map((n) => Math.abs(n - currentAlpha));
  const maxVariation = Math.max(...variations);
  return maxVariation > 100 && currentAlpha > 50;
}

function isLikelyNoise(
  neighbors: number[],
  currentAlpha: number,
  avgAlpha: number
): boolean {
  // ノイズの特徴：周囲と大きく異なる孤立したピクセル
  return (
    currentAlpha < 50 && avgAlpha < 30 && Math.abs(currentAlpha - avgAlpha) > 20
  );
}

export async function removeBackgroundIfEnabled(
  src: string,
  outDir = "./uploads",
  refineEdges = true
): Promise<string> {
  if (!fs.existsSync(src)) return src;
  if (MODE === "none") return src;

  const baseName = path.basename(src, path.extname(src));
  const tempOut = path.join(outDir, `rembg_temp_${baseName}.png`);
  const finalOut = path.join(outDir, `rembg_${baseName}.png`);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    if (MODE === "cli") {
      await execFileAsync("rembg", ["i", src, tempOut]);
      if (fs.existsSync(tempOut)) {
        // エッジ補正を適用
        if (refineEdges) {
          await refineAlpha(tempOut, finalOut);
          // 一時ファイルを削除
          fs.unlinkSync(tempOut);
        } else {
          fs.renameSync(tempOut, finalOut);
        }
        return finalOut;
      }
      return src;
    } else if (MODE === "http") {
      // 最低限のHTTP実装（multipart送信）。独自APIに合わせて改良してください。
      const boundary = "----rembg" + Math.random().toString(16).slice(2);
      const data = fs.readFileSync(src);
      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${path.basename(
          src
        )}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n` +
        data +
        `\r\n--${boundary}--`;

      const { request } = await import("node:http");
      await new Promise<void>((resolve, reject) => {
        const req = request(
          HTTP_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${boundary}`,
              "Content-Length": Buffer.byteLength(body as any),
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              const buf = Buffer.concat(chunks);
              fs.writeFileSync(tempOut, buf);
              resolve();
            });
          }
        );
        req.on("error", reject);
        req.write(body as any);
        req.end();
      });

      if (fs.existsSync(tempOut)) {
        // エッジ補正を適用
        if (refineEdges) {
          await refineAlpha(tempOut, finalOut);
          fs.unlinkSync(tempOut);
        } else {
          fs.renameSync(tempOut, finalOut);
        }
        return finalOut;
      }
      return src;
    }
  } catch (e) {
    console.warn("[bgremove] fallback to original:", (e as any)?.message);
    return src;
  }
  return src;
}

export async function addAlphaOutline(srcPng: string, params?: { widthPx?: number; color?: string; opacity?: number }) {
  const widthPx = params?.widthPx ?? 2;
  const color = params?.color ?? "#ffffff";
  const opacity = params?.opacity ?? 0.9;

  const base = sharp(srcPng).ensureAlpha();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) return srcPng;

  // アルファを膨張（blur→threshold）して外側に"グロー"を作る
  const expandedA = await base.extractChannel("alpha").blur(widthPx).threshold(1).toBuffer();
  const col = tinycolor(color).toRgb();

  // 白いアウトラインレイヤを作り、expandedA をアルファとして付与
  const outlineBuf = await sharp({
    create: { width: meta.width, height: meta.height, channels: 3, background: { r: col.r, g: col.g, b: col.b } }
  })
    .joinChannel(await sharp(expandedA).linear(opacity).toBuffer())
    .png()
    .toBuffer();

  const out = srcPng.replace(/\.png$/i, `_outline.png`);
  // アウトラインの上に元画像を重ねる → 外側だけ白縁が見える
  await sharp(outlineBuf).composite([{ input: srcPng }]).png().toFile(out);
  return out;
}

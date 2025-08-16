import fs from "node:fs";
import path from "node:path";
import ColorThief from "colorthief";
import tinycolor from "tinycolor2";

async function initProfile(logoPath: string, outPath: string) {
  try {
    const palette = await ColorThief.getPalette(logoPath, 5);
    const [r, g, b] = palette[0];
    const primary = tinycolor({ r, g, b }).toHexString();
    const text =
      tinycolor.readability(primary, "#000") >= 4.5 ? "#000000" : "#ffffff";

    const profile = {
      brandName: "新規店舗",
      colors: {
        primary,
        secondary: tinycolor(primary).lighten(30).toHexString(),
        accent: "#FFD93D",
        text,
      },
      font: { family: "Noto Sans JP", path: "" },
      tone: "元気",
      layoutDensity: "normal",
      safeMargin: 48,
      fontScale: 1.0,
      saturation: 1.0,
      rules: { showPrice: true, showDiscount: true, showBadge: true },
    };

    // 出力ディレクトリを作成
    const outDir = path.dirname(path.resolve(outPath));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(
      path.resolve(outPath),
      JSON.stringify(profile, null, 2),
      "utf-8"
    );
    console.log(`✅ Profile initialized at ${outPath}`);
    console.log(`Primary color: ${primary}, Text color: ${text}`);
  } catch (error) {
    console.error(`❌ Error initializing profile: ${error}`);
    // ロゴ読み込みに失敗した場合はデフォルトプロファイルを作成
    const defaultProfile = {
      brandName: "新規店舗",
      colors: {
        primary: "#D92C2C",
        secondary: "#FFE8E8",
        accent: "#FFD93D",
        text: "#111111",
      },
      font: { family: "Noto Sans JP", path: "" },
      tone: "元気",
      layoutDensity: "normal",
      safeMargin: 48,
      fontScale: 1.0,
      saturation: 1.0,
      rules: { showPrice: true, showDiscount: true, showBadge: true },
    };

    const outDir = path.dirname(path.resolve(outPath));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(
      path.resolve(outPath),
      JSON.stringify(defaultProfile, null, 2),
      "utf-8"
    );
    console.log(`✅ Default profile created at ${outPath}`);
  }
}

// 例: node --loader tsx src/tools/init-profile.ts ./assets/logo.png ./data/profiles/shopA.json
const [logo, out] = process.argv.slice(2);
if (!logo || !out) {
  console.log(
    "Usage: tsx src/tools/init-profile.ts <logoPath> <outProfileJson>"
  );
  process.exit(1);
}
initProfile(logo, out);

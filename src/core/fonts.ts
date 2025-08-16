import { GlobalFonts } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

// フォント設定タイプ
export type FontFallbackConfig = {
  primary: string; // 第一希望フォント名
  fallbacks: string[]; // フォールバック候補
  weight?: string; // "400", "700", "bold" など
  style?: string; // "normal", "italic"
};

// デフォルトフォント設定
const DEFAULT_FONTS: Record<string, FontFallbackConfig> = {
  japanese: {
    primary: "Noto Sans CJK JP",
    fallbacks: [
      "Hiragino Sans",
      "Yu Gothic",
      "Meiryo",
      "MS Gothic",
      "Arial Unicode MS",
    ],
    weight: "400",
    style: "normal",
  },
  "japanese-bold": {
    primary: "Noto Sans CJK JP",
    fallbacks: [
      "Hiragino Sans",
      "Yu Gothic",
      "Meiryo",
      "MS Gothic",
      "Arial Unicode MS",
    ],
    weight: "700",
    style: "normal",
  },
  english: {
    primary: "Inter",
    fallbacks: ["Roboto", "Helvetica Neue", "Arial", "sans-serif"],
    weight: "400",
    style: "normal",
  },
  "english-bold": {
    primary: "Inter",
    fallbacks: ["Roboto", "Helvetica Neue", "Arial", "sans-serif"],
    weight: "700",
    style: "normal",
  },
  display: {
    primary: "Montserrat",
    fallbacks: ["Oswald", "Impact", "Arial Black", "Arial"],
    weight: "600",
    style: "normal",
  },
};

// システムフォント検出
function detectSystemFonts(): string[] {
  const detected: string[] = [];

  // Windows
  const windowsFonts = ["C:/Windows/Fonts/*.ttf", "C:/Windows/Fonts/*.otf"];

  // macOS
  const macFonts = [
    "/System/Library/Fonts/*.ttf",
    "/System/Library/Fonts/*.otf",
    "/Library/Fonts/*.ttf",
    "/Library/Fonts/*.otf",
  ];

  // Linux
  const linuxFonts = [
    "/usr/share/fonts/**/*.ttf",
    "/usr/share/fonts/**/*.otf",
    "/usr/local/share/fonts/*.ttf",
    "/usr/local/share/fonts/*.otf",
  ];

  const allPaths = [...windowsFonts, ...macFonts, ...linuxFonts];

  try {
    for (const pattern of allPaths) {
      const files = fg.sync(pattern, { onlyFiles: true });
      detected.push(...files);
    }
  } catch (error) {
    console.warn("Font detection failed:", error);
  }

  return detected;
}

// プロジェクト内フォント検出・登録
function loadProjectFonts(fontsDir = "./src/assets/fonts"): string[] {
  const loaded: string[] = [];

  if (!fs.existsSync(fontsDir)) {
    return loaded;
  }

  try {
    const fontFiles = fg.sync([
      path.join(fontsDir, "**/*.ttf"),
      path.join(fontsDir, "**/*.otf"),
      path.join(fontsDir, "**/*.woff"),
      path.join(fontsDir, "**/*.woff2"),
    ]);

    for (const fontPath of fontFiles) {
      try {
        const fontName = path.basename(fontPath, path.extname(fontPath));
        const registered = GlobalFonts.registerFromPath(fontPath, fontName);
        if (registered) {
          loaded.push(fontName);
          console.log(`✅ Font registered: ${fontName} (${fontPath})`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to register font: ${fontPath}`, error);
      }
    }
  } catch (error) {
    console.warn("Project font loading failed:", error);
  }

  return loaded;
}

// フォント可用性チェック
function isFontAvailable(fontName: string): boolean {
  try {
    const families = GlobalFonts.families;
    return families.some(
      (family) =>
        family.family.toLowerCase() === fontName.toLowerCase() ||
        family.family.includes(fontName)
    );
  } catch {
    return false;
  }
}

// 最適フォント選択
export function selectBestFont(config: FontFallbackConfig): string {
  const candidates = [config.primary, ...config.fallbacks];

  for (const fontName of candidates) {
    if (isFontAvailable(fontName)) {
      console.log(`🎯 Selected font: ${fontName}`);
      return fontName;
    }
  }

  // 最終フォールバック
  const systemFallback =
    process.platform === "win32"
      ? "Arial"
      : process.platform === "darwin"
      ? "Helvetica"
      : "DejaVu Sans";

  console.warn(
    `⚠️ No preferred fonts available, using system fallback: ${systemFallback}`
  );
  return systemFallback;
}

// プリセット取得
export function getFontConfig(
  preset: keyof typeof DEFAULT_FONTS
): FontFallbackConfig {
  return DEFAULT_FONTS[preset] || DEFAULT_FONTS.japanese;
}

// フォント初期化（アプリ起動時に1回実行）
export function initializeFonts(): {
  systemFonts: string[];
  projectFonts: string[];
  availableFamilies: string[];
} {
  console.log("🔤 Initializing font system...");

  // プロジェクトフォント読み込み
  const projectFonts = loadProjectFonts();

  // システムフォント検出
  const systemFonts = detectSystemFonts();

  // 利用可能フォント一覧
  const availableFamilies = GlobalFonts.families.map((f) => f.family);

  console.log(`📊 Font Summary:
  - Project fonts: ${projectFonts.length}
  - System fonts detected: ${systemFonts.length}
  - Available families: ${availableFamilies.length}`);

  return {
    systemFonts,
    projectFonts,
    availableFamilies,
  };
}

// フォント文字列構築（CSS font-family スタイル）
export function buildFontFamily(config: FontFallbackConfig): string {
  const allFonts = [config.primary, ...config.fallbacks];
  return allFonts
    .map((font) => (font.includes(" ") ? `"${font}"` : font))
    .join(", ");
}

// 使用例：
// const fontConfig = getFontConfig("japanese-bold");
// const selectedFont = selectBestFont(fontConfig);
// canvas context で使用: ctx.font = `${fontConfig.weight} 24px ${selectedFont}`;

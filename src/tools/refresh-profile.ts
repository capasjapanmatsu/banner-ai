import fs from "fs-extra";
import path from "node:path";
import puppeteer from "puppeteer";
import ColorThief from "colorthief";
import tinycolor from "tinycolor2";

function bestTextOn(bg: string) {
  const b = tinycolor.readability(bg, "#000");
  const w = tinycolor.readability(bg, "#fff");
  return b >= w ? "#000000" : "#ffffff";
}

async function paletteFromImage(imgPath: string, n = 6) {
  const pal = await ColorThief.getPalette(imgPath, n);
  return pal.map((rgb: any) =>
    tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHexString()
  );
}

async function pickColors(snapPath: string, brandPrimary: string) {
  const pal = await paletteFromImage(snapPath, 6);
  // 明度・彩度の極端な色を除外して上から選ぶ
  const filtered = pal.filter((hex: string) => {
    const c = tinycolor(hex);
    const br = c.getBrightness(); // 0-255
    const sat = c.toHsl().s * 100;
    return br > 30 && br < 235 && sat > 8;
  });
  const primary = filtered[0] || brandPrimary;
  const secondary = tinycolor(primary).lighten(20).desaturate(10).toHexString();
  const accent = tinycolor(primary)
    .complement()
    .saturate(18)
    .lighten(6)
    .toHexString();
  const text = bestTextOn(primary);
  return { primary, secondary, accent, text };
}

async function snap(url: string, outDir = "./out"): Promise<string> {
  await fs.ensureDir(outDir);
  const file = path.join(outDir, `snap_${Date.now()}.png`);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    // 余計なオーバーレイがあれば消す
    await page.evaluate(() => {
      const sel = [
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[class*="modal"]',
        '[role="dialog"]',
      ];
      document.querySelectorAll(sel.join(",")).forEach((el: any) => {
        el.style.display = "none";
      });
    });
    await page.screenshot({ path: file as `${string}.png`, fullPage: true });
    return file;
  } finally {
    await browser.close();
  }
}

async function main() {
  const [url, profilePath = "./data/profiles/sample.json"] =
    process.argv.slice(2);
  if (!url) {
    console.log(
      "Usage: tsx src/tools/refresh-profile.ts <storeUrl> [profileJson]"
    );
    process.exit(1);
  }
  const abs = path.resolve(profilePath);
  const prof = fs.existsSync(abs)
    ? JSON.parse(fs.readFileSync(abs, "utf-8"))
    : {};
  const brandPrimary = prof?.colors?.primary || "#D92C2C";

  console.log("🔎 Crawling:", url);
  const snapPath = await snap(url);
  console.log("🖼  Screenshot:", snapPath);

  const colors = await pickColors(snapPath, brandPrimary);
  const updated = {
    ...prof,
    colors: { ...(prof.colors || {}), ...colors },
    meta: {
      ...(prof.meta || {}),
      lastRefreshedAt: new Date().toISOString(),
      sourceUrl: url,
    },
  };
  await fs.writeJSON(abs, updated, { spaces: 2 });
  console.log("✅ Profile updated:", abs);
  console.log(updated.colors);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

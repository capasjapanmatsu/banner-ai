import ColorThief from "colorthief";
import tinycolor from "tinycolor2";

export type HarmonyMode =
  | "brand"
  | "auto-analogous"
  | "auto-complementary"
  | "auto-soft";
export type Colors = {
  primary: string;
  secondary?: string;
  accent?: string;
  text?: string;
};

const toHex = (rgb: number[]) =>
  tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHexString();

function bestTextOn(bg: string) {
  const cBlack = tinycolor.readability(bg, "#000");
  const cWhite = tinycolor.readability(bg, "#fff");
  return cBlack >= cWhite ? "#000000" : "#ffffff";
}

export async function getPaletteFromImage(
  path: string,
  n = 6
): Promise<string[]> {
  const pal = await ColorThief.getPalette(path, n);
  return pal.map(toHex);
}

export async function pickHarmoniousColors(params: {
  imagePath: string;
  profilePrimary: string;
  mode: HarmonyMode;
}): Promise<Colors> {
  const { imagePath, profilePrimary, mode } = params;
  const pal = await getPaletteFromImage(imagePath, 6);
  const base = tinycolor(pal[0] ?? profilePrimary);

  if (mode === "brand") {
    const primary = tinycolor
      .mix(profilePrimary, pal[1] ?? pal[0] ?? profilePrimary, 20)
      .toHexString();
    const secondary = tinycolor(primary)
      .lighten(22)
      .desaturate(10)
      .toHexString();
    const accent = tinycolor(profilePrimary)
      .complement()
      .saturate(18)
      .lighten(6)
      .toHexString();
    return { primary, secondary, accent, text: bestTextOn(primary) };
  }

  if (mode === "auto-analogous") {
    const an = base.analogous();
    const primary = tinycolor(an[0].toHexString()).lighten(8).toHexString();
    const secondary = tinycolor(an[1].toHexString())
      .lighten(18)
      .desaturate(10)
      .toHexString();
    const accent = tinycolor(an[2].toHexString())
      .saturate(12)
      .lighten(4)
      .toHexString();
    return { primary, secondary, accent, text: bestTextOn(primary) };
  }

  if (mode === "auto-complementary") {
    const comp = base.complement();
    const primary = tinycolor(base.toHexString()).lighten(6).toHexString();
    const secondary = tinycolor(primary)
      .desaturate(12)
      .lighten(16)
      .toHexString();
    const accent = tinycolor(comp.toHexString())
      .saturate(18)
      .lighten(6)
      .toHexString();
    return { primary, secondary, accent, text: bestTextOn(primary) };
  }

  // auto-soft
  const primary = tinycolor(base.toHexString())
    .desaturate(20)
    .lighten(12)
    .toHexString();
  const secondary = tinycolor(primary).lighten(16).toHexString();
  const accent = tinycolor(primary).saturate(12).lighten(6).toHexString();
  return { primary, secondary, accent, text: bestTextOn(primary) };
}

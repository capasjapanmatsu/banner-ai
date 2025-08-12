// lib/learning.ts
import type { BannerSpec } from "@/types/banner";

/** AI案(before) と 最終案(after) の"学習に必要な差分"だけ抽出 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeDeltas(before: BannerSpec, after: BannerSpec): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deltas: any = { fonts: {}, colors: {}, layout: {} };

  // 代表フォント（最初のtextレイヤのfont）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bFont = (before.layers.find(l => (l as any).type === "text") as any)?.style?.font;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aFont = (after.layers.find(l => (l as any).type === "text") as any)?.style?.font;
  if (aFont && aFont !== bFont) deltas.fonts[aFont] = 1;

  // アクセント色
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bAcc = (before.palette as any).accent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aAcc = (after.palette as any).accent;
  if (aAcc && aAcc !== bAcc) deltas.colors[aAcc] = 1;

  // CTA位置の象限（ざっくり）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aCTA = after.layers.find(l => (l as any).type === "cta") as any;
  if (aCTA) {
    const { w, h } = after.meta.size;
    const pos =
      aCTA.x > w / 2 ? (aCTA.y > h / 2 ? "bottom_right" : "top_right")
                     : (aCTA.y > h / 2 ? "bottom_left"  : "top_left");
    deltas.layout.cta_pos = { [pos]: 1 };
  }
  return deltas;
}

/** プロファイルに差分を反映（指数減衰で"最近"をやや優遇） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyProfileUpdate(profile: any, deltas: any, audience?: string): any {
  const decay = 0.97;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inc = (obj: any, key: string, add = 1) => { obj[key] = (obj[key] ?? 0) * decay + add; };

  profile = profile ?? {};
  profile.font_prefs  ??= {};
  profile.color_prefs ??= {};
  profile.layout_prefs ??= { cta_pos: {} };

  for (const f of Object.keys(deltas.fonts ?? {})) inc(profile.font_prefs, f);
  for (const c of Object.keys(deltas.colors ?? {})) inc(profile.color_prefs, c);

  const pos = deltas.layout?.cta_pos ? Object.keys(deltas.layout.cta_pos)[0] : null;
  if (pos) {
    profile.layout_prefs.cta_pos ??= {};
    inc(profile.layout_prefs.cta_pos, pos);
  }

  // セグメント（例：women / men）別にも記録
  if (audience) {
    profile.segments ??= {};
    profile.segments[audience] ??= { font_prefs: {}, color_prefs: {}, layout_prefs: { cta_pos: {} } };
    const seg = profile.segments[audience];
    for (const f of Object.keys(deltas.fonts ?? {})) inc(seg.font_prefs, f);
    for (const c of Object.keys(deltas.colors ?? {})) inc(seg.color_prefs, c);
    if (pos) inc(seg.layout_prefs.cta_pos, pos);
  }

  profile.updated_at = new Date().toISOString();
  return profile;
}

/** プロファイルの"好み"を初期案に反映（ウォームスタート） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function warmStartSpec(base: BannerSpec, profile: any, audience?: string): BannerSpec {
  const pickTop = (m?: Record<string, number>) =>
    m ? Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0] : undefined;

  const p = audience && profile?.segments?.[audience] ? profile.segments[audience] : profile ?? {};
  const font  = pickTop(p?.font_prefs);
  const accent = pickTop(p?.color_prefs);
  const ctaPos = pickTop(p?.layout_prefs?.cta_pos);

  const spec: BannerSpec = structuredClone(base);

  if (font) {
    for (const l of spec.layers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((l as any).type === "text" || (l as any).type === "cta") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (l as any).style = { ...(l as any).style, font };
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (accent) (spec.palette as any).accent = accent;

  if (ctaPos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cta = spec.layers.find(l => (l as any).type === "cta") as any;
    if (cta) {
      const { w, h } = spec.meta.size;
      const m = 64;
      const map: Record<string, [number, number]> = {
        top_left: [m, m],
        top_right: [w - cta.w - m, m],
        bottom_left: [m, h - cta.h - m],
        bottom_right: [w - cta.w - m, h - cta.h - m],
      };
      const [x, y] = map[ctaPos] ?? [cta.x, cta.y];
      cta.x = x; cta.y = y;
    }
  }
  return spec;
}

// lib/assistant.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BannerSpec } from "@/types/banner";
import type { AssistantDecision, DesignBrief } from "@/types/assistant";

const REQUIRED_FIELDS: (keyof DesignBrief)[] = ["headline", "cta"];

export function analyzeBrief(brief: Partial<DesignBrief>): { missing: (keyof DesignBrief)[], confidence: number } {
  const missing = REQUIRED_FIELDS.filter(f => !brief[f]);
  // 確度は超簡易：必須が埋まっていれば高め、サンプル色/フォントがあればさらに↑
  let confidence = 0.5;
  if (missing.length === 0) confidence += 0.3;
  if (brief.sampleColors?.length) confidence += 0.1;
  if (brief.fontCandidates?.length) confidence += 0.1;
  if ((brief as any).sampleUrls?.length)  confidence += 0.05;
  if ((brief as any).sampleImages?.length) confidence += 0.1;
  return { missing, confidence: Math.min(0.99, confidence) };
}

export function buildQuestions(missing: (keyof DesignBrief)[], brief: Partial<DesignBrief>): AssistantDecision {
  const qs = missing.map((f, i) => {
    if (f === "headline") return {
      id: `q-${i}`, field: f, text: "見出し（最も大きく見せたい文言）は？", required: true, placeholder: "例）夏の大感謝祭"
    };
    if (f === "cta") return {
      id: `q-${i}`, field: f, text: "CTA（ボタン文言）は？", required: true, choices: ["今すぐチェック", "詳細を見る", "カートに入れる"]
    };
    return { id: `q-${i}`, field: f, text: `${String(f)} を教えてください` };
  });
  return { status: "need_info", confidence: 0.6, questions: qs, brief };
}

export function proposalFromBrief(brief: DesignBrief): BannerSpec[] {
  const { size, platform } = brief;
  const bg = brief.brandColor ? tint(brief.brandColor, 0.9) : (brief.sampleColors?.[0] ?? "#FFFFFF");
  const primary = brief.brandColor ?? (brief.sampleColors?.[1] ?? "#0E5CAD");
  const accent = brief.sampleColors?.[2] ?? "#FF3B30";
  const font = brief.fontCandidates?.[0] ?? "Noto Sans JP";

  const base: BannerSpec = {
    meta: { platform, size },
    palette: { bg, primary, accent },
    layers: [
      { type: "bg", style: { kind: "solid", color: bg } } as any,
      { type: "text", text: brief.headline ?? "見出し", x: 64, y: 80, maxW: size.w - 128,
        style: { font, weight: 900, size: Math.round(size.h * 0.08), fill: primary,
          stroke: { color: "#FFFFFF", width: 6 }, lineHeight: 1.05 } } as any,
      brief.subcopy ? { type: "text", text: brief.subcopy, x: 64, y: Math.round(size.h * 0.26), maxW: size.w - 128,
        style: { font, weight: 700, size: Math.round(size.h * 0.045), fill: primary } } as any : null,
      brief.discount ? { type: "text", text: brief.discount, x: 64, y: Math.round(size.h * 0.36),
        style: { font, weight: 900, size: Math.round(size.h * 0.085), fill: accent,
          stroke: { color: "#FFFFFF", width: 10 } } } as any : null,
      brief.deadline ? { type: "text", text: brief.deadline, x: 64, y: Math.round(size.h * 0.48),
        style: { font, weight: 700, size: Math.round(size.h * 0.04), fill: primary } } as any : null,
      { type: "cta", text: brief.cta ?? "今すぐチェック", x: 64, y: Math.round(size.h * 0.60), w: Math.min(360, Math.round(size.w * 0.4)), h: Math.round(size.h * 0.09),
        style: { bg: primary, fill: "#FFFFFF", radius: 18, font, weight: 700, size: Math.round(size.h * 0.045) } } as any,
    ].filter(Boolean) as any[],
    export: { format: "png", quality: 0.92, maxBytes: platform === "rakuten" ? 900_000 : 1_200_000 },
  };

  // バリエーション：CTA位置とアクセント違いを3案
  const variants: BannerSpec[] = [
    base,
    mutate(base, { cta: "bottom_right" }, { accent: darken(accent, 0.1) }),
    mutate(base, { cta: "top_right" }, { accent: accent }),
  ];
  return variants;
}

// --- helpers ---
function mutate(spec: BannerSpec, pos: { cta: "bottom_right" | "top_right" }, palette?: { accent?: string }) {
  const s = structuredClone(spec) as BannerSpec;
  const { w, h } = s.meta.size;
  const m = 64;
  const cta = s.layers.find(l => (l as any).type === "cta") as any;
  if (cta) {
    const map = {
      bottom_right: [w - cta.w - m, h - cta.h - m],
      top_right: [w - cta.w - m, m],
    };
    const [x, y] = map[pos.cta];
    cta.x = x; cta.y = y;
  }
  if (palette?.accent) (s.palette as any).accent = palette.accent;
  return s;
}
function hexToRgb(hex: string){ const h=hex.replace("#",""); const n=parseInt(h.length===3? h.split("").map(c=>c+c).join(""):h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex(r:number,g:number,b:number){ return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join(""); }
function tint(hex:string, amt:number){ const {r,g,b}=hexToRgb(hex); const w=255; return rgbToHex(Math.round(r+(w-r)*amt),Math.round(g+(w-g)*amt),Math.round(b+(w-b)*amt)); }
function darken(hex:string, amt:number){ const {r,g,b}=hexToRgb(hex); const f=1-amt; return rgbToHex(Math.round(r*f),Math.round(g*f),Math.round(b*f)); }

export function decide(brief: Partial<DesignBrief>): AssistantDecision {
  const { missing, confidence } = analyzeBrief(brief);
  if (missing.length > 0) return buildQuestions(missing, brief);
  return { status: "ready", confidence: Math.max(confidence, 0.8), brief: brief as DesignBrief, proposals: proposalFromBrief(brief as DesignBrief) };
}

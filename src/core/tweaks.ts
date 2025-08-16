import fs from "fs-extra";
import path from "node:path";

export type Tweak = {
  titleScale?: number;
  priceScale?: number;
  badgeScale?: number;
  imageScale?: number;
  spacingScale?: number;
  safeMarginOverride?: number;
};

type TweaksFile = { [templateId: string]: Tweak } & { "*": Tweak };

export function loadTweaks(tenantId: string): TweaksFile | null {
  const fp = path.resolve(
    `./data/stores/${tenantId}/tweaks/template-tweaks.json`
  );
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

export function applyTweaks(params: {
  layers: any[];
  templateId: string;
  tenantId?: string;
  profile: any;
}) {
  const { layers, templateId, tenantId, profile } = params;
  if (!tenantId) return { layers, profile };
  const tweaks = loadTweaks(tenantId);
  if (!tweaks) return { layers, profile };

  const base = tweaks["*"] || {};
  const spec = { ...base, ...(tweaks[templateId] || {}) };

  if (spec.safeMarginOverride && profile?.safeMargin !== undefined) {
    profile.safeMargin = spec.safeMarginOverride;
  }

  const scaled = layers.map((ly: any) => {
    if (ly?.type === "text") {
      if (/価格|¥|円/.test(ly.text ?? "")) {
        ly.fontSize = Math.floor((ly.fontSize || 24) * (spec.priceScale || 1));
      } else {
        ly.fontSize = Math.floor((ly.fontSize || 24) * (spec.titleScale || 1));
      }
      if (spec.spacingScale) {
        ly.y = ly.y * spec.spacingScale;
      }
    } else if (ly?.type === "badge") {
      if (spec.badgeScale) {
        ly.w *= spec.badgeScale;
        ly.h *= spec.badgeScale;
      }
      if (spec.spacingScale) ly.y = ly.y * spec.spacingScale;
    } else if (ly?.type === "image") {
      if (spec.imageScale) {
        ly.w *= spec.imageScale;
        ly.h *= spec.imageScale;
      }
      if (spec.spacingScale) ly.y = ly.y * spec.spacingScale;
    }
    return ly;
  });

  return { layers: scaled, profile };
}

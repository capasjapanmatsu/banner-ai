import type { BannerInput, TemplateResult } from "./index";

export const rankAwardTemplate = (p: BannerInput): TemplateResult => {
  const badgeText = p.badge ?? "ランキング受賞";
  return {
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "secondary" },
      {
        type: "rect",
        x: 0,
        y: 0,
        w: p.size.w,
        h: Math.floor(p.size.h * 0.38),
        fill: "primary",
      },
      {
        type: "text",
        text: badgeText,
        x: 0.06 * p.size.w,
        y: 0.08 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 900,
        fontSize: Math.floor(p.size.w * 0.09),
        fill: "text",
      },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.48 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 800,
        fontSize: Math.floor(p.size.w * 0.1),
        fill: "text",
      },
      p.price
        ? {
            type: "text",
            text: p.price,
            x: 0.06 * p.size.w,
            y: 0.76 * p.size.h,
            maxWidth: 0.88 * p.size.w,
            fontWeight: 700,
            fontSize: Math.floor(p.size.w * 0.085),
            fill: "text",
          }
        : null,
    ].filter(Boolean),
  };
};

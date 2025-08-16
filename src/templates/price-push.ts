import type { BannerInput, TemplateResult } from "./index";

export const pricePushTemplate = (p: BannerInput): TemplateResult => {
  return {
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "secondary" },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.12 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 800,
        fontSize: Math.floor(p.size.w * 0.09),
        fill: "text",
      },
      p.discount
        ? {
            type: "badge",
            text: p.discount,
            x: 0.06 * p.size.w,
            y: 0.46 * p.size.h,
            w: 0.38 * p.size.w,
            h: 0.14 * p.size.h,
            fill: "accent",
            textFill: "text",
          }
        : null,
      p.price
        ? {
            type: "text",
            text: p.price,
            x: 0.06 * p.size.w,
            y: 0.7 * p.size.h,
            maxWidth: 0.88 * p.size.w,
            fontWeight: 900,
            fontSize: Math.floor(p.size.w * 0.12),
            fill: "text",
          }
        : null,
    ].filter(Boolean),
  };
};

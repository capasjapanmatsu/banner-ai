import type { BannerInput, TemplateResult } from "./index";

export const limitedTimeTemplate = (p: BannerInput): TemplateResult => {
  const period = p.period ? `期間：${p.period}` : "期間限定";
  return {
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "primary" },
      {
        type: "rect",
        x: 0,
        y: Math.floor(p.size.h * 0.62),
        w: p.size.w,
        h: Math.floor(p.size.h * 0.38),
        fill: "secondary",
      },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.14 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 900,
        fontSize: Math.floor(p.size.w * 0.11),
        fill: "text",
      },
      {
        type: "badge",
        text: period,
        x: 0.06 * p.size.w,
        y: 0.48 * p.size.h,
        w: 0.48 * p.size.w,
        h: 0.12 * p.size.h,
        fill: "accent",
        textFill: "text",
      },
      p.price
        ? {
            type: "text",
            text: p.price,
            x: 0.06 * p.size.w,
            y: 0.78 * p.size.h,
            maxWidth: 0.88 * p.size.w,
            fontWeight: 800,
            fontSize: Math.floor(p.size.w * 0.09),
            fill: "text",
          }
        : null,
    ].filter(Boolean),
  };
};

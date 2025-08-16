import type { BannerInput, TemplateResult } from "./index";

export const productHeroTemplate = (
  p: BannerInput & { image?: string; fit?: "contain" | "cover" }
): TemplateResult => {
  const imgArea = {
    x: 0.55 * p.size.w,
    y: 0.12 * p.size.h,
    w: 0.38 * p.size.w,
    h: 0.76 * p.size.h,
  };
  return {
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "secondary" },
      {
        type: "rect",
        x: 0,
        y: 0,
        w: Math.floor(p.size.w * 0.52),
        h: p.size.h,
        fill: "primary",
      },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.12 * p.size.h,
        maxWidth: 0.4 * p.size.w,
        fontWeight: 900,
        fontSize: Math.floor(p.size.w * 0.09),
        fill: "text",
      },
      p.discount
        ? {
            type: "badge",
            text: p.discount,
            x: 0.06 * p.size.w,
            y: 0.48 * p.size.h,
            w: 0.3 * p.size.w,
            h: 0.12 * p.size.h,
            fill: "accent",
            textFill: "text",
          }
        : null,
      p.price
        ? {
            type: "text",
            text: p.price,
            x: 0.06 * p.size.w,
            y: 0.74 * p.size.h,
            maxWidth: 0.4 * p.size.w,
            fontWeight: 800,
            fontSize: Math.floor(p.size.w * 0.1),
            fill: "text",
          }
        : null,
      p.image
        ? {
            type: "image",
            src: p.image,
            x: imgArea.x,
            y: imgArea.y,
            w: imgArea.w,
            h: imgArea.h,
            fit: p.fit ?? "contain",
            radius: 24,
            removeBg: true,
            shadow: "ellipse",
            shadowOpacity: 0.32,
            shadowOffsetY: 8,
            colorFit: { mode: "brand-align", strength: 1 },
            outline: { widthPx: 2, color: "#ffffff", opacity: 0.85 }
          }
        : null,
    ].filter(Boolean),
  };
};

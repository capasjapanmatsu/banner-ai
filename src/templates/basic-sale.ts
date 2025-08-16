export type BannerInput = {
  title: string;
  price?: string;
  discount?: string;
  size: { w: number; h: number };
};

export const basicSaleTemplate = (p: BannerInput) => {
  return {
    background: "primary", // profile.colors.primary を参照
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "primary" },
      {
        type: "rect",
        x: 0,
        y: Math.floor(p.size.h * 0.65),
        w: p.size.w,
        h: Math.floor(p.size.h * 0.35),
        fill: "secondary",
      },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.18 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 800,
        fontSize: Math.floor(p.size.w * 0.1),
        fill: "text",
      },
      p.discount
        ? {
            type: "badge",
            text: p.discount,
            x: 0.06 * p.size.w,
            y: 0.56 * p.size.h,
            w: 0.28 * p.size.w,
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
            y: 0.8 * p.size.h,
            maxWidth: 0.88 * p.size.w,
            fontWeight: 700,
            fontSize: Math.floor(p.size.w * 0.09),
            fill: "text",
          }
        : null,
    ].filter(Boolean),
  };
};

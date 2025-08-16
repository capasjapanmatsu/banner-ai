import type { BannerInput, TemplateResult } from "./index";

export const variantGridTemplate = (p: BannerInput): TemplateResult => {
  const v = (p.variants ?? []).slice(0, 4);
  const cellW = p.size.w * 0.42;
  const cellH = p.size.h * 0.2;
  const left = p.size.w * 0.06;
  const top = p.size.h * 0.54;
  const gapX = p.size.w * 0.04;
  const gapY = p.size.h * 0.04;

  const cells = v
    .map((name, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = left + col * (cellW + gapX);
      const y = top + row * (cellH + gapY);
      return [
        { type: "rect", x, y, w: cellW, h: cellH, fill: "secondary" },
        {
          type: "text",
          text: name,
          x: x + 16,
          y: y + 12,
          maxWidth: cellW - 32,
          fontWeight: 700,
          fontSize: Math.floor(p.size.w * 0.045),
          fill: "text",
        },
      ];
    })
    .flat();

  return {
    layers: [
      { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "primary" },
      {
        type: "text",
        text: p.title,
        x: 0.06 * p.size.w,
        y: 0.12 * p.size.h,
        maxWidth: 0.88 * p.size.w,
        fontWeight: 900,
        fontSize: Math.floor(p.size.w * 0.1),
        fill: "text",
      },
      ...cells,
    ],
  };
};

import type { TemplateResult } from "./index";

type Item = { image?: string; title?: string; price?: string; badge?: string };

export const catalogGridTemplate = (p: {
  size: { w: number; h: number };
  items: Item[];
}): TemplateResult => {
  const N = Math.max(1, Math.min(8, p.items.length));
  // 列数の自動決定（3〜4列を中心に）
  const cols = N <= 3 ? N : N <= 6 ? 3 : 4;
  const rows = Math.ceil(N / cols);

  const padX = p.size.w * 0.06;
  const padY = p.size.h * 0.1;
  const gap = p.size.w * 0.03;

  const gridW = p.size.w - padX * 2;
  const gridH = p.size.h - padY * 2;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  const layers: any[] = [
    { type: "rect", x: 0, y: 0, w: p.size.w, h: p.size.h, fill: "secondary" },
    {
      type: "text",
      text: "おすすめアイテム",
      x: padX,
      y: padY * 0.4,
      maxWidth: p.size.w - padX * 2,
      fontWeight: 900,
      fontSize: Math.floor(p.size.w * 0.06),
      fill: "text",
    },
  ];

  for (let i = 0; i < N; i++) {
    const it = p.items[i];
    const r = Math.floor(i / cols),
      c = i % cols;
    const x = padX + c * (cellW + gap);
    const y = padY + r * (cellH + gap) + p.size.h * 0.06;

    layers.push(
      { type: "rect", x, y, w: cellW, h: cellH, fill: "primary" },
      {
        type: "image",
        src: it.image || "",
        x: x + cellW * 0.1,
        y: y + cellH * 0.12,
        w: cellW * 0.8,
        h: cellH * 0.48,
        fit: "contain",
        radius: 18,
        removeBg: true,
        shadow: "ellipse",
        shadowOpacity: 0.28,
      },
      it.title
        ? {
            type: "text",
            text: it.title,
            x: x + cellW * 0.06,
            y: y + cellH * 0.64,
            maxWidth: cellW * 0.88,
            fontWeight: 700,
            fontSize: Math.floor(p.size.w * 0.035),
            fill: "text",
          }
        : null,
      it.price
        ? {
            type: "text",
            text: it.price,
            x: x + cellW * 0.06,
            y: y + cellH * 0.82,
            maxWidth: cellW * 0.88,
            fontWeight: 800,
            fontSize: Math.floor(p.size.w * 0.04),
            fill: "text",
          }
        : null,
      it.badge
        ? {
            type: "badge",
            text: it.badge,
            x: x + cellW * 0.58,
            y: y + cellH * 0.06,
            w: cellW * 0.36,
            h: cellH * 0.16,
            fill: "accent",
            textFill: "text",
          }
        : null
    );
  }

  return { layers: layers.filter(Boolean) };
};

import { z } from "zod";

export const ProfileSchema = z.object({
  brandName: z.string(),
  colors: z.object({
    primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    text: z.string().optional(),
  }),
  font: z.object({
    family: z.string().default("Noto Sans JP"),
    path: z.string().optional(), // ./src/assets/fonts/xxx.ttf
  }),
  tone: z.enum(["元気", "上品", "信頼", "ポップ"]).default("元気"),
  layoutDensity: z.enum(["compact", "normal", "airy"]).default("normal"),
  safeMargin: z.number().default(36), // px
  fontScale: z.number().optional(), // 学習用：文字サイズ倍率
  saturation: z.number().optional(), // 学習用：彩度調整
  rules: z
    .object({
      showPrice: z.boolean().default(true),
      showDiscount: z.boolean().default(true),
      showBadge: z.boolean().default(false),
    })
    .default(() => ({ showPrice: true, showDiscount: true, showBadge: false })),
});
export type Profile = z.infer<typeof ProfileSchema>;

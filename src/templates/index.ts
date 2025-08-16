export type BannerInput = {
  title: string;
  price?: string;
  discount?: string;
  badge?: string; // 例: 楽天ランキング1位
  period?: string; // 例: 8/18-8/20
  variants?: string[]; // 例: ["S","M","L","XL"]
  size: { w: number; h: number };
};

export type TemplateResult = { layers: any[] };
export type TemplateFn = (p: BannerInput) => TemplateResult;

export { basicSaleTemplate } from "./basic-sale";
export { productHeroTemplate } from "./product-hero";
export { catalogGridTemplate } from "./catalog-grid";

// 動的インポートは実行時に解決
export const TEMPLATES: Record<string, () => Promise<TemplateFn>> = {
  "basic-sale": async () => (await import("./basic-sale")).basicSaleTemplate,
  "rank-award": async () => (await import("./rank-award")).rankAwardTemplate,
  "limited-time": async () =>
    (await import("./limited-time")).limitedTimeTemplate,
  "price-push": async () => (await import("./price-push")).pricePushTemplate,
  "variant-grid": async () =>
    (await import("./variant-grid")).variantGridTemplate,
  "product-hero": async () =>
    (await import("./product-hero")).productHeroTemplate,
  "catalog-grid": async () =>
    (await import("./catalog-grid")).catalogGridTemplate,
};

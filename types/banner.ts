export interface BannerMeta {
  platform: "rakuten" | "yahoo" | "custom";
  size: {
    w: number;
    h: number;
  };
  mode?: "banner" | "product"; // 出品画像モード追加
  overlays?: {
    topBlack?: number;    // 上部ブラックフェード（0-1の割合）
    bottomBlack?: number; // 下部ブラックフェード（0-1の割合）
    vignette?: number;    // ビネット効果（0-1の不透明度）
  };
}

export interface BannerPalette {
  bg: string;
  primary: string;
  accent?: string;
}

// 背景エフェクト用の型定義
export interface BackgroundEffect {
  type: "gradient" | "pattern" | "shadow" | "blur" | "color";
  gradient?: {
    type: "linear" | "radial";
    colors: string[];
    direction?: number; // degrees for linear
  };
  pattern?: {
    type: "dots" | "lines" | "grid";
    color: string;
    size: number;
    opacity: number;
  };
  shadow?: {
    color: string;
    blur: number;
    x: number;
    y: number;
  };
  blur?: {
    radius: number;
  };
  color?: string;
}

// 画像エフェクト用の型定義
export type FilterFX = {
  brightness?: number;   // 1.0 が基準、0.0〜2.0
  contrast?: number;     // 1.0 が基準
  saturation?: number;   // 1.0 が基準
  blur?: number;         // px
  grayscale?: number;    // 0〜1
  dropShadow?: { dx: number; dy: number; blur: number; color: string }; // 例: {0,8,16,"rgba(0,0,0,.2)"}
};

export type ImageEffects = {
  filter?: FilterFX;
  // 画像のマスク（円形フェザー等）
  mask?: { kind: "ellipse" | "rect"; feather?: number }; // feather: 0〜1
};

export interface LayerStyle {
  font?: string;
  weight?: number | string;
  size?: number;
  fill?: string;
  stroke?: {
    color: string;
    width: number;
  };
}

export interface CTAStyle extends LayerStyle {
  bg: string;
  radius?: number;
}

export interface BaseLayer {
  id?: string;
  type: "bg" | "image" | "logo" | "text" | "badge" | "cta";
  x: number;
  y: number;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  maxW?: number;
  style: { 
    font: string; 
    weight: number; 
    size: number; 
    fill: string; 
    stroke?: { color: string; width: number }; 
    lineHeight?: number 
  };
}

export interface ImageLayer extends BaseLayer {
  type: "image" | "logo";
  src: string;
  w: number;
  h: number;
  opacity?: number;
  // 出品画像モード用の追加プロパティ
  backgroundRemoved?: boolean; // 背景除去済みかどうか
  backgroundEffect?: BackgroundEffect; // 背景エフェクト
  originalSrc?: string; // 元画像のURL（背景除去前）
  // 画像エフェクト
  effects?: ImageEffects;
}

export interface CTALayer extends BaseLayer {
  type: "cta";
  text: string;
  w: number;
  h: number;
  style: { 
    bg: string; 
    fill: string; 
    radius?: number; 
    font: string; 
    weight: number; 
    size: number 
  };
}

export interface BadgeLayer extends BaseLayer {
  type: "badge";
  text: string;
  r: number;
  style: { 
    bg: string; 
    fill: string; 
    font: string; 
    weight: number; 
    size: number 
  };
}

export interface BgLayer extends BaseLayer {
  type: "bg";
  style: { kind: "solid" | "gradient"; from?: string; to?: string; color?: string };
}

export type BannerLayer = TextLayer | ImageLayer | CTALayer | BadgeLayer | BgLayer;

export interface BannerExport {
  format: "png" | "webp";
  quality?: number;
  maxBytes?: number;
}

export interface BannerSpec {
  meta: BannerMeta;
  palette: BannerPalette;
  layers: BannerLayer[];
  export: BannerExport;
}

export interface UploadedFile {
  file: File;
  url: string;
  type: "reference" | "product" | "logo";
}

export interface ExtractResult {
  colors: string[];
  fontCandidates: string[];
}

export interface PresetConfig {
  platform: "rakuten" | "yahoo" | "custom";
  name: string;
  size: { w: number; h: number };
  maxBytes?: number;
}

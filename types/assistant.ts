// types/assistant.ts
import type { BannerSpec } from "@/types/banner";

export type Audience = "women" | "men" | null;

export type DesignBrief = {
  platform: "rakuten" | "yahoo" | "custom";
  size: { w: number; h: number };
  audience?: Audience;
  // ユーザー入力/抽出で埋まる想定
  headline?: string;
  subcopy?: string;
  discount?: string;   // "20%OFF" 等
  deadline?: string;   // "本日23:59" 等
  cta?: string;        // "今すぐチェック"
  tone?: "cute" | "cool" | "simple" | "luxury" | "pop";
  brandColor?: string;
  sampleColors?: string[];
  fontCandidates?: string[];
  sampleUrls?: string[];     // 指示に含まれる参照URL
  sampleImages?: string[];   // チャットで添付されたスクショの dataURL（MVPではそのまま）
};

export type AssistantQuestion = {
  id: string;
  field: keyof DesignBrief;
  text: string;
  required?: boolean;
  choices?: string[];
  placeholder?: string;
};

export type AssistantDecision =
  | { status: "need_info"; confidence: number; questions: AssistantQuestion[]; brief: Partial<DesignBrief>; notes?: string[] }
  | { status: "ready"; confidence: number; brief: DesignBrief; proposals: BannerSpec[]; notes?: string[] };

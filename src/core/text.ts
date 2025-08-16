// ざっくり日本語向けの要約＋改行最適化（依存なし・高速）
export type SmartTitleOptions = {
  maxChars?: number; // 文字数上限（全角=1カウント）
  maxLines?: number; // 最大行数
  preferBreak?: (
    | "、"
    | "・"
    | "／"
    | "/"
    | "|"
    | "｜"
    | " "
    | "-"
    | "—"
    | "・"
  )[]; // 改行候補
};

const DEFAULT_OPTS: SmartTitleOptions = {
  maxChars: 24,
  maxLines: 2,
  preferBreak: ["、", "・", "／", "/", "｜", "|", "-", " "],
};
const NOISE = [
  /\b[A-Z]{2,}\d{2,}\b/g, // 型番 ABC1234
  /\bJAN[:：]?\s*\d{8,13}\b/gi,
  /【[^】]+】/g,
  /\[[^\]]+\]/g,
  /\([^)]{6,}\)/g, // カッコ長文
  /(?:送料無料|最安|激安|訳あり|SALE|SALE中)/gi,
];

const PROHIBIT_START = "、。，．・：；!?！？））」』】]％%".split("");
const PROHIBIT_END = "（「『［【(".split("");

function charWidth(c: string): number {
  // 簡易：全角=1、半角=0.5
  const code = c.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9faf) return 1; // CJK統合漢字
  if (code >= 0x3040 && code <= 0x309f) return 1; // ひらがな
  if (code >= 0x30a0 && code <= 0x30ff) return 1; // カタカナ
  if (code >= 0xff01 && code <= 0xff5e) return 1; // 全角記号
  return 0.5;
}

function stringWidth(s: string): number {
  return [...s].reduce((acc, c) => acc + charWidth(c), 0);
}

function removeNoise(text: string): string {
  let clean = text;
  for (const reg of NOISE) {
    clean = clean.replace(reg, "");
  }
  return clean.replace(/\s+/g, " ").trim();
}

function summarizeText(text: string, maxChars: number): string {
  let clean = removeNoise(text);
  if (stringWidth(clean) <= maxChars) return clean;

  // キーワード抽出風の簡易要約
  const words = clean.split(/[\s、。・]+/).filter((w) => w.length > 0);
  const important = words.filter((w) => {
    // 短すぎる・長すぎる・数字のみは重要度低
    if (w.length < 2 || w.length > 12) return false;
    if (/^\d+$/.test(w)) return false;
    return true;
  });

  let result = "";
  for (const word of important) {
    if (stringWidth(result + word) > maxChars) break;
    result += (result ? " " : "") + word;
  }

  return result || clean.slice(0, Math.floor(maxChars / 2));
}

function smartLineBreaks(
  text: string,
  maxChars: number,
  maxLines: number,
  preferBreak: string[]
): string {
  if (maxLines === 1) return text;

  const lines: string[] = [];
  let remaining = text;

  for (let lineNum = 0; lineNum < maxLines && remaining; lineNum++) {
    const isLastLine = lineNum === maxLines - 1;
    const targetWidth = isLastLine ? Infinity : maxChars;

    if (stringWidth(remaining) <= targetWidth) {
      lines.push(remaining);
      break;
    }

    // 改行ポイントを探す
    let bestBreak = -1;
    let bestScore = 0;

    for (
      let i = Math.floor(remaining.length * 0.3);
      i < remaining.length;
      i++
    ) {
      if (stringWidth(remaining.slice(0, i)) > targetWidth) break;

      const char = remaining[i];
      const next = remaining[i + 1] || "";

      let score = 0;
      if (preferBreak.includes(char)) score += 10;
      if (char === " ") score += 8;
      if (!PROHIBIT_START.includes(next)) score += 5;
      if (!PROHIBIT_END.includes(char)) score += 3;

      // 中央寄りを優遇
      const position = i / remaining.length;
      if (position >= 0.3 && position <= 0.7) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestBreak = i;
      }
    }

    if (bestBreak > 0) {
      const line = remaining.slice(0, bestBreak + 1).trim();
      lines.push(line);
      remaining = remaining.slice(bestBreak + 1).trim();
    } else {
      // 強制切断
      const cutPoint = Math.floor(targetWidth);
      lines.push(remaining.slice(0, cutPoint));
      remaining = remaining.slice(cutPoint);
    }
  }

  return lines.join("\n");
}

export function smartTitle(
  rawTitle: string,
  opts: SmartTitleOptions = {}
): string {
  const { maxChars, maxLines, preferBreak } = { ...DEFAULT_OPTS, ...opts };

  if (!rawTitle?.trim()) return "";

  // 1. ノイズ除去 & 要約
  const summarized = summarizeText(rawTitle, maxChars! * maxLines!);

  // 2. 改行最適化
  const optimized = smartLineBreaks(
    summarized,
    maxChars!,
    maxLines!,
    preferBreak!
  );

  return optimized;
}

// 使用例：
// smartTitle("【送料無料】高性能ワイヤレスイヤホン ANC機能付き Bluetooth5.3対応 IPX7防水 JAN:4901234567890", { maxChars: 20, maxLines: 2 })
// → "高性能ワイヤレスイヤホン\nANC機能付き Bluetooth"

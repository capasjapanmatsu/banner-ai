export type Market = "generic" | "r10" | "yss";

type Dict = {
  forbidden: RegExp[];
  needsEvidence: RegExp[];
  notesBase?: string[];
};

const COMMON_FORBIDDEN = [
  /100%/i,
  /永久|完全無料|無制限保証/,
  /世界一|日本一|業界最安/,
];
const COMMON_NEEDS_EVIDENCE = [/No\.?1/i, /ランキング.?1位/, /最安値|公式最安/];

export const DICTS: Record<Market, Dict> = {
  generic: {
    forbidden: COMMON_FORBIDDEN,
    needsEvidence: COMMON_NEEDS_EVIDENCE,
    notesBase: [],
  },
  // 楽天市場（例示）
  r10: {
    forbidden: [...COMMON_FORBIDDEN, /医療効果|痩せる|絶対/i],
    needsEvidence: [...COMMON_NEEDS_EVIDENCE, /レビュー高評価|○冠達成/],
    notesBase: [
      "※楽天市場の表記ルールに配慮してください。根拠は出典・期間・条件を明記。",
    ],
  },
  // Yahoo!ショッピング（例示）
  yss: {
    forbidden: [...COMMON_FORBIDDEN, /誇大|完全無欠/i],
    needsEvidence: [...COMMON_NEEDS_EVIDENCE, /売上第1位|話題沸騰/],
    notesBase: [
      "※Yahoo!ショッピングの表記ルールに配慮。根拠は出典・期間・条件を明記。",
    ],
  },
};

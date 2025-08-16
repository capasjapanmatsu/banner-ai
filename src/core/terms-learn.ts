import fs from "fs-extra";
import path from "node:path";

type TokenRow = {
  count: number;
  removed: number;
  variants: Record<string, number>;
};
type Stats = Record<string, TokenRow>;

const STATS_PATH = (tenantId: string) =>
  path.resolve(`./data/stores/${tenantId}/kb/terms-stats.json`);

function isKanaKanjiOrWord(s: string) {
  return /[一-龠ぁ-ゖァ-ヺーA-Za-z0-9]/.test(s);
}
function normalizeBase(s: string) {
  return s
    .replace(/％/g, "%")
    .replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();
}
function tokenizeJa(s: string) {
  // 大まかな分割（形態素解析なしの軽量版）
  const chunks = s
    .split(/[\s、。・／\/｜\|\-\—\(\)\[\]【】「」『』:,;!？?!＋+~～]/)
    .filter(Boolean);
  const toks = chunks.flatMap((ch) => {
    const m = ch.match(/[一-龠ぁ-ゖァ-ヺーA-Za-z0-9%]+/g);
    return m || [];
  });
  return toks.filter((t) => isKanaKanjiOrWord(t) && t.length >= 2);
}

export async function updateTermStats(
  tenantId: string,
  originalTitle: string,
  finalTitle: string
) {
  const fp = STATS_PATH(tenantId);
  const stats: Stats = (await fs.pathExists(fp)) ? await fs.readJSON(fp) : {};
  const origTokens = tokenizeJa(originalTitle);
  const finalTokens = new Set(tokenizeJa(finalTitle).map(normalizeBase));

  for (const t of origTokens) {
    const base = normalizeBase(t);
    stats[base] ??= { count: 0, removed: 0, variants: {} };
    stats[base].count += 1;
    stats[base].variants[t] = (stats[base].variants[t] || 0) + 1;
    if (!finalTokens.has(base)) stats[base].removed += 1;
  }
  await fs.ensureFile(fp);
  await fs.writeJSON(fp, stats, { spaces: 2 });
}

type Suggest = {
  keepCandidates: Array<{ token: string; count: number; removedRate: number }>;
  replaceCandidates: Array<{ from: string; to: string; count: number }>;
  dropCandidates: Array<{ token: string; count: number; removedRate: number }>;
};

export async function suggestTerms(
  tenantId: string,
  limit = 20
): Promise<Suggest> {
  const fp = STATS_PATH(tenantId);
  if (!(await fs.pathExists(fp)))
    return { keepCandidates: [], replaceCandidates: [], dropCandidates: [] };
  const stats: Stats = await fs.readJSON(fp);
  // 既存辞書を読み込んで除外
  const termsPath = path.resolve(`./data/stores/${tenantId}/kb/terms.json`);
  const terms = (await fs.pathExists(termsPath))
    ? await fs.readJSON(termsPath)
    : {};
  const keepSet = new Set<string>((terms.keep || []).map((x: string) => x));
  const dropSet = new Set<string>((terms.drop || []).map((x: string) => x));
  const replaceFrom = new Set<string>(Object.keys(terms.replace || {}));

  const rows = Object.entries(stats).map(([base, row]) => {
    const removedRate = row.count ? row.removed / row.count : 0;
    return { base, ...row, removedRate };
  });

  // keep候補：頻出（>=3）かつ削除率が低い（<=0.3）、辞書未登録
  const keep = rows
    .filter(
      (r) =>
        r.count >= 3 &&
        r.removedRate <= 0.3 &&
        !keepSet.has(r.base) &&
        !dropSet.has(r.base)
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((r) => ({
      token: r.base,
      count: r.count,
      removedRate: Number(r.removedRate.toFixed(2)),
    }));

  // replace候補：同じbaseでバリアントが複数、最頻バリアントを正とし他を置換提案
  const rep: Array<{ from: string; to: string; count: number }> = [];
  for (const r of rows) {
    const variants = Object.entries(r.variants).sort((a, b) => b[1] - a[1]); // [variant, count]
    if (variants.length <= 1) continue;
    const canonical = variants[0][0];
    for (let i = 1; i < variants.length; i++) {
      const from = variants[i][0];
      if (replaceFrom.has(from)) continue;
      rep.push({ from, to: canonical, count: variants[i][1] });
    }
  }
  const replaceCandidates = rep
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  // drop候補：頻出（>=3）かつ削除率が高い（>=0.7）、辞書未登録
  const drop = rows
    .filter(
      (r) =>
        r.count >= 3 &&
        r.removedRate >= 0.7 &&
        !keepSet.has(r.base) &&
        !dropSet.has(r.base)
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((r) => ({
      token: r.base,
      count: r.count,
      removedRate: Number(r.removedRate.toFixed(2)),
    }));

  return { keepCandidates: keep, replaceCandidates, dropCandidates: drop };
}

export async function applyTermsUpdate(
  tenantId: string,
  patch: {
    addKeep?: string[];
    addDrop?: string[];
    addReplace?: Array<{ from: string; to: string }>;
  }
) {
  const fp = path.resolve(`./data/stores/${tenantId}/kb/terms.json`);
  const terms = (await fs.pathExists(fp))
    ? await fs.readJSON(fp)
    : { keep: [], drop: [], replace: {} };
  const keepSet = new Set<string>(terms.keep || []);
  const dropSet = new Set<string>(terms.drop || []);
  const rep = terms.replace || {};

  (patch.addKeep || []).forEach((k) => keepSet.add(k));
  (patch.addDrop || []).forEach((k) => dropSet.add(k));
  (patch.addReplace || []).forEach((p) => {
    rep[p.from] = p.to;
  });

  const out = {
    ...terms,
    keep: Array.from(keepSet),
    drop: Array.from(dropSet),
    replace: rep,
  };
  await fs.writeJSON(fp, out, { spaces: 2 });
  return out;
}

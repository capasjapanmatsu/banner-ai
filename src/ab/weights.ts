import fs from "fs-extra";
import path from "node:path";

export type Stats = Record<string, { plays: number; wins: number }>;

function statsPath(tenantId: string, market: string) {
  return path.resolve(`./data/stores/${tenantId}/ab/${market}.json`);
}
function metaPath(tenantId: string, market: string) {
  return path.resolve(`./data/stores/${tenantId}/ab/${market}.meta.json`);
}

async function readMeta(tenantId: string, market: string) {
  const fp = metaPath(tenantId, market);
  if (await fs.pathExists(fp)) return await fs.readJSON(fp);
  return { lastDecayAt: new Date().toISOString() };
}
async function writeMeta(tenantId: string, market: string, meta: any) {
  await fs.ensureFile(metaPath(tenantId, market));
  await fs.writeJSON(metaPath(tenantId, market), meta, { spaces: 2 });
}

export async function loadStats(tenantId: string, market: string, templates: string[], opts?: { halfLifeDays?: number }): Promise<Stats> {
  const fp = statsPath(tenantId, market);
  let stats: Stats = (await fs.pathExists(fp)) ? await fs.readJSON(fp) : {};
  // 未登録テンプレ初期化
  for (const t of templates) stats[t] ??= { plays: 0, wins: 0 };
  await fs.ensureFile(fp); await fs.writeJSON(fp, stats, { spaces: 2 });

  // ★ 時間減衰を適用
  const meta = await readMeta(tenantId, market);
  const halfLife = Number(opts?.halfLifeDays ?? process.env.AB_HALFLIFE_DAYS ?? 30);
  const last = new Date(meta.lastDecayAt || new Date().toISOString()).getTime();
  const now = Date.now();
  const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));

  if (days >= 0.5 && halfLife > 0) {
    const factor = Math.pow(0.5, days / halfLife); // e.g. 30日で半分
    for (const k of Object.keys(stats)) {
      stats[k].plays *= factor;
      stats[k].wins  *= factor;
    }
    await fs.writeJSON(fp, stats, { spaces: 2 });
    meta.lastDecayAt = new Date(now).toISOString();
    await writeMeta(tenantId, market, meta);
  }
  return stats;
}

export async function saveStats(tenantId: string, market: string, stats: Stats) {
  await fs.writeJSON(statsPath(tenantId, market), stats, { spaces: 2 });
}

export function pickTemplatesEpsGreedy(stats: Stats, templates: string[], k = 3, epsilon = 0.2): string[] {
  const arr = templates.slice();
  const scores = arr.map(t => {
    const s = stats[t] || { plays: 0, wins: 0 };
    const rate = s.plays > 0 ? s.wins / s.plays : 0.5;
    return { t, rate, plays: s.plays };
    // plays が小さいテンプレは探索で拾われやすい（epsilon ランダム）
  });

  const chosen = new Set<string>();
  while (chosen.size < Math.min(k, arr.length)) {
    if (Math.random() < epsilon) {
      const c = arr[Math.floor(Math.random() * arr.length)];
      chosen.add(c);
    } else {
      scores.sort((a, b) => (b.rate - a.rate) || (a.plays - b.plays));
      for (const s of scores) { if (!chosen.has(s.t)) { chosen.add(s.t); break; } }
    }
  }
  return Array.from(chosen);
}

export async function recordPlays(tenantId: string, market: string, picks: string[]) {
  const fp = statsPath(tenantId, market);
  const stats: Stats = (await fs.pathExists(fp)) ? await fs.readJSON(fp) : {};
  for (const t of picks) { (stats[t] ??= { plays: 0, wins: 0 }).plays += 1; }
  await fs.writeJSON(fp, stats, { spaces: 2 });
}

export async function recordWin(tenantId: string, market: string, winner: string) {
  const fp = statsPath(tenantId, market);
  const stats: Stats = (await fs.pathExists(fp)) ? await fs.readJSON(fp) : {};
  (stats[winner] ??= { plays: 0, wins: 0 }).wins += 1;
  await fs.writeJSON(fp, stats, { spaces: 2 });
}

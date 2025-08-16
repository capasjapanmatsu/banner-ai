import { loadStats, saveStats } from "./weights";

export async function applyCtrEvent(params: {
  tenantId: string;
  market: string;
  template: string;
  impressions: number;
  clicks: number;
}) {
  const { tenantId, market, template, impressions, clicks } = params;
  if (impressions < 0 || clicks < 0) throw new Error("invalid metrics");
  const stats = await loadStats(tenantId, market, [template]);
  const cur = stats[template] || { plays: 0, wins: 0 };
  cur.plays += impressions;
  cur.wins += clicks;
  stats[template] = cur;
  await saveStats(tenantId, market, stats);
  return { plays: cur.plays, wins: cur.wins };
}

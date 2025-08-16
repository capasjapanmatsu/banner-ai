import fs from "fs-extra";
import path from "node:path";
import { loadStats, saveStats } from "./weights";

const args = process.argv.slice(2);
const tenant = args.includes("--tenant")
  ? args[args.indexOf("--tenant") + 1]
  : "demo";
const market = args.includes("--market")
  ? args[args.indexOf("--market") + 1]
  : "generic";
const profilePath = args.includes("--profile")
  ? args[args.indexOf("--profile") + 1]
  : "./data/profiles/sample.json";

(async () => {
  const prof = JSON.parse(fs.readFileSync(path.resolve(profilePath), "utf-8"));
  const init: Record<string, number> = prof.templateInit || {};

  // 既存テンプレ名を取得（weights側で持っている想定。無ければ固定配列でもOK）
  const ALL = [
    "product-hero",
    "basic-sale",
    "rank-award",
    "limited-time",
    "price-push",
    "variant-grid",
  ];
  const stats = await loadStats(tenant, market, ALL);

  // まだデータが空（全て plays=0）の時のみ反映
  const empty = Object.values(stats).every(
    (s) => (s?.plays ?? 0) === 0 && (s?.wins ?? 0) === 0
  );
  if (!empty) {
    console.log("AB stats already exist. Skip bootstrap.");
    process.exit(0);
  }

  // prior は wins=w, plays= w*2 で開始（勝率0.5の事前分布）
  for (const t of ALL) {
    const w = init[t] ?? 0;
    stats[t] = { plays: w * 2, wins: w };
  }
  await saveStats(tenant, market, stats);
  console.log(`✅ Bootstrapped AB stats for ${tenant}/${market}`);
})();

import path from "node:path";
import fs from "fs-extra";
import { nanoid } from "nanoid";
import { generateBanner } from "../core/generate";
import { presets } from "../presets";
import {
  loadStats,
  pickTemplatesEpsGreedy,
  recordPlays,
  recordWin,
} from "./weights";

const ALL_TEMPLATES = [
  "product-hero",
  "basic-sale",
  "rank-award",
  "limited-time",
  "price-push",
  "variant-grid",
];

export async function suggestCandidates(params: {
  tenantId: string;
  market: string;
  n: number;
  preset?: string;
  size?: string;
  profilePath: string;
  payload: Record<string, any>;
}) {
  const { tenantId, market, n, preset, size, profilePath, payload } = params;
  let W = 1080,
    H = 1080;
  if (preset) {
    const p = presets[preset];
    if (p) [W, H] = p.size.split("x").map(Number);
  } else if (size) {
    [W, H] = size.split("x").map(Number);
  }
  const stats = await loadStats(tenantId, market, ALL_TEMPLATES);
  const picks = pickTemplatesEpsGreedy(stats, ALL_TEMPLATES, n);
  await recordPlays(tenantId, market, picks);

  const sessionId = `${Date.now()}_${nanoid(6)}`;
  const sessionDir = path.resolve(`./data/stores/${tenantId}/ab/sessions`);
  await fs.ensureDir(sessionDir);

  const results: Array<{ id: string; template: string; path: string }> = [];
  for (const tpl of picks) {
    const id = nanoid(8);
    const out = path.resolve(`./out/ab_${sessionId}_${tpl}.png`);
    const pth = await generateBanner({
      template: tpl,
      profilePath,
      size: { w: W, h: H },
      payload,
      notes: [],
    });
    // 既定のファイル名を AB用にリネーム
    await fs.move(pth, out, { overwrite: true });
    results.push({ id, template: tpl, path: out });
  }

  const sessionLog = path.join(sessionDir, `${sessionId}.json`);
  await fs.writeJSON(
    sessionLog,
    { picks: results, payload, preset, size, market },
    { spaces: 2 }
  );

  // クライアント向けの相対パス
  return {
    sessionId,
    candidates: results.map((r) => ({
      id: r.id,
      template: r.template,
      url: "/" + path.relative(path.resolve("."), r.path).replace(/\\/g, "/"),
    })),
  };
}

export async function selectWinner(params: {
  tenantId: string;
  market: string;
  sessionId: string;
  choiceId: string;
}) {
  const { tenantId, market, sessionId, choiceId } = params;
  const sessionFile = path.resolve(
    `./data/stores/${tenantId}/ab/sessions/${sessionId}.json`
  );
  if (!(await fs.pathExists(sessionFile))) throw new Error("session not found");
  const ses = await fs.readJSON(sessionFile);
  const chosen = (ses.picks as any[]).find((p) => p.id === choiceId);
  if (!chosen) throw new Error("choice not found");
  await recordWin(tenantId, market, chosen.template);
  return { ok: true, winner: chosen.template };
}

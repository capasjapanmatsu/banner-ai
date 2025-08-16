import fs from "node:fs";
import path from "node:path";

export type Prefs = {
  tone?: "上品" | "元気" | "信頼";
  brevity?: number;
  emoji?: number;
};

export function loadPrefs(tenantId: string): Prefs {
  const fp = path.resolve(`./data/stores/${tenantId}/prefs.json`);
  return fs.existsSync(fp)
    ? JSON.parse(fs.readFileSync(fp, "utf-8"))
    : { brevity: 1, emoji: 0 };
}

export function applyFeedback(
  tenantId: string,
  tag: "上品に" | "元気に" | "短く" | "詳しく" | "絵文字控えめ" | "絵文字多め"
) {
  const fp = path.resolve(`./data/stores/${tenantId}/prefs.json`);
  const p = loadPrefs(tenantId);
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  if (tag === "上品に") p.tone = "上品";
  if (tag === "元気に") p.tone = "元気";
  if (tag === "短く") p.brevity = clamp((p.brevity || 1) + 0.2, 0.6, 1.6);
  if (tag === "詳しく") p.brevity = clamp((p.brevity || 1) - 0.2, 0.6, 1.6);
  if (tag === "絵文字控えめ") p.emoji = clamp((p.emoji || 0) - 0.2, 0, 1);
  if (tag === "絵文字多め") p.emoji = clamp((p.emoji || 0) + 0.2, 0, 1);

  fs.writeFileSync(fp, JSON.stringify(p, null, 2), "utf-8");
}

export function styleHints(tenantId: string) {
  const p = loadPrefs(tenantId);
  const hints: string[] = [];
  if (p.tone) hints.push(`語調は「${p.tone}」`);
  if (p.brevity && p.brevity > 1) hints.push("できるだけ要点を短く");
  if (p.brevity && p.brevity < 1) hints.push("丁寧に詳しく");
  if ((p.emoji || 0) === 0) hints.push("絵文字は使わない");
  if ((p.emoji || 0) > 0.5) hints.push("適度に絵文字を使う");
  return hints.join("／");
}

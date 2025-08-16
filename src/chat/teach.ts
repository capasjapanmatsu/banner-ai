import fs from "node:fs";
import path from "node:path";

export type TeachSample = {
  tenantId: string;
  input: string;
  model_output: string;
  ideal_output: string;
  tags?: string[];
  reason?: string;
  createdAt?: string;
};

export function saveTeachSample(s: TeachSample) {
  const dir = path.resolve(`./data/stores/${s.tenantId}/teach`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, "samples.jsonl");
  s.createdAt = new Date().toISOString();
  fs.appendFileSync(fp, JSON.stringify(s) + "\n", "utf-8");
}

export function loadFewShots(tenantId: string, k = 4) {
  const fp = path.resolve(`./data/stores/${tenantId}/teach/samples.jsonl`);
  if (!fs.existsSync(fp)) return [];
  const lines = fs.readFileSync(fp, "utf-8").trim().split("\n");
  return lines.slice(-k).map((l) => JSON.parse(l));
}

export function fewShotBlock(tenantId: string) {
  const shots = loadFewShots(tenantId, 4);
  if (!shots.length) return "";
  return shots
    .map((s: any) => `[User]\n${s.input}\n[Assistant]\n${s.ideal_output}`)
    .join("\n---\n");
}

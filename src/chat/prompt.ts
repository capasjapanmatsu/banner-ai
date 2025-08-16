import fs from "node:fs";
import path from "node:path";

export function buildSystemPrompt(tenantId: string) {
  const stylePath = path.resolve(`./data/stores/${tenantId}/kb/style.json`);
  const style = fs.existsSync(stylePath)
    ? JSON.parse(fs.readFileSync(stylePath, "utf-8"))
    : {};
  const voice = (style.voice || []).join("・") || "丁寧で明瞭";
  const prefer = (style.preferred_phrases || []).join("／");
  const ng = (style.ng_phrases || []).join("／");
  const faq = (style.faq || [])
    .map((x: any) => `Q: ${x.q}\nA: ${x.a}`)
    .join("\n");

  return [
    "あなたはEC店舗の接客・販促アシスタントです。",
    `トーン: ${voice}`,
    prefer ? `推奨表現: ${prefer}` : "",
    ng ? `禁止/注意表現: ${ng}` : "",
    faq ? `既知のFAQ:\n${faq}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

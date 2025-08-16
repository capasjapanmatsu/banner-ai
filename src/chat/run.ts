import { buildSystemPrompt } from "./prompt";
import { fewShotBlock } from "./teach";
import { styleHints } from "./prefs";

/**
 * 実際のモデル呼び出しの直前に使う。
 * あなたの既存の「LLM呼び出しコード」で、system と user をこれで置き換えてください。
 */
export function buildPromptForChat(tenantId: string, userMessage: string) {
  const sys = buildSystemPrompt(tenantId);
  const shots = fewShotBlock(tenantId); // 訂正Few-shot
  const hints = styleHints(tenantId); // 嗜好ヒント
  const system = [
    sys,
    hints ? `スタイル指示: ${hints}` : "",
    shots ? `以下は過去の良い応答例:\n${shots}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user: userMessage };
}

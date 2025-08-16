import type { Market } from "./compliance-dicts";
import { DICTS } from "./compliance-dicts";

export type ComplianceResult = {
  title: string;
  notes: string[];
  warnings: string[];
};

export function checkCopyCompliance(
  title: string,
  market: Market = "generic",
  evidence?: string
): ComplianceResult {
  const dict = DICTS[market] ?? DICTS.generic;
  const warnings: string[] = [];
  const notes: string[] = [...(dict.notesBase ?? [])];

  if (dict.forbidden.some((r) => r.test(title))) {
    warnings.push("⚠ 禁止/過度表現が含まれます。表現の見直しを。");
    notes.push("※根拠不要な断定的表現・誇大表現は避けてください。");
  }

  const hitClaims = dict.needsEvidence.some((r) => r.test(title));
  if (hitClaims && !evidence) {
    warnings.push(
      "⚠ 根拠が必要な表現（No.1/最安/ランキング等）が含まれますが、根拠が未入力です。"
    );
    notes.push("※出典・期間・条件を注記で明示してください。");
  }
  if (hitClaims && evidence) notes.push(`※根拠：${evidence}`);

  if (title.length > 28)
    warnings.push("ℹ 見出しが長めです。視認性低下に注意。");

  return { title, notes, warnings };
}

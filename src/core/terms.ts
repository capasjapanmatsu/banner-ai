import fs from "fs-extra";
import path from "node:path";

type Terms = {
  keep?: string[];
  replace?: Record<string, string>;
  drop?: string[];
  normalize?: { fullwidthPercentToAscii?: boolean; collapseSpaces?: boolean };
};

export function loadTerms(tenantId: string): Terms {
  const fp = path.resolve(`./data/stores/${tenantId}/kb/terms.json`);
  if (!fs.existsSync(fp)) return {};
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

export function applyTerms(tenantId: string, input: string) {
  const t = loadTerms(tenantId);
  let s = String(input);

  // 正規化
  if (t.normalize?.fullwidthPercentToAscii) {
    s = s.replace(/％/g, "%");
  }
  if (t.normalize?.collapseSpaces) {
    s = s.replace(/\s+/g, " ");
  }

  // 置換
  if (t.replace) {
    for (const [k, v] of Object.entries(t.replace)) {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      s = s.replace(re, v);
    }
  }

  // ドロップ語の除去（keep に含まれる語は保護）
  if (t.drop?.length) {
    for (const ng of t.drop) {
      if (t.keep?.some((k) => k.includes(ng))) continue;
      const re = new RegExp(ng.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      s = s.replace(re, " ");
    }
  }

  // keep 語を保護（後段の要約で端折られにくくするためマーカーで囲んでおく）
  if (t.keep?.length) {
    for (const kw of t.keep) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      s = s.replace(re, (m) => `§${m}§`);
    }
  }

  // 余分な空白整理
  s = s.replace(/\s{2,}/g, " ").trim();

  // 呼び出し側で smartTitle を通した後、最後にマーカーを外してください。
  return s;
}

export function unprotectKeepMarkers(s: string) {
  return s.replace(/§/g, "");
}

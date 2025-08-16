import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { generateBanner } from "./core/generate";
import { presets } from "./presets";
import { checkCopyCompliance } from "./compliance";
import type { Market } from "./compliance-dicts";
import { saveTeachSample } from "./chat/teach";
import { applyFeedback } from "./chat/prefs";
import { suggestCandidates, selectWinner } from "./ab/service";
import { pickHarmoniousColors } from "./core/palette";
import { applyCtrEvent } from "./ab/ingest";
import { applyTerms, unprotectKeepMarkers } from "./core/terms";
import { smartTitle } from "./core/text";
import {
  lookupLibraryByFile,
  checkRights,
  fingerprint,
} from "./core/assetmeta";
import {
  updateTermStats,
  suggestTerms,
  applyTermsUpdate,
} from "./core/terms-learn";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.static("public"));
app.use("/out", express.static("out"));

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const body = req.body as any;
    const file = req.file;

    const preset =
      body.preset && presets[body.preset]
        ? presets[body.preset]
        : { size: body.size || "1080x1080" };
    const [w, h] = preset.size.split("x").map(Number);

    const tenantId = (body.tenantId as string) || "demo";
    const market = (body.market as Market) || "generic";

    // 辞書適用 → コンプライアンスチェック → タイトル要約
    const preProcessed = applyTerms(tenantId, body.title || "新規バナー");
    const compliance = checkCopyCompliance(preProcessed, market, body.evidence);

    // タイトル要約
    let titleOut = compliance.title;
    if (String(body.titleSummarize || "true") === "true") {
      titleOut = smartTitle(titleOut, {
        maxChars: Number(body.titleMax || 24),
        maxLines: Number(body.titleLines || 2),
      });
    }
    titleOut = unprotectKeepMarkers(titleOut);

    // パレット色生成
    const paletteMode = body.paletteMode as any;
    let colorsOverride: any = undefined;
    const imgPath = file ? path.resolve(file.path) : undefined;

    if (paletteMode && imgPath) {
      try {
        const profilePath = body.profile || "./data/profiles/sample.json";
        const profile = fs.existsSync(profilePath)
          ? JSON.parse(fs.readFileSync(profilePath, "utf-8"))
          : { colors: { primary: "#D92C2C" } };
        colorsOverride = await pickHarmoniousColors({
          imagePath: imgPath,
          profilePrimary: profile.colors?.primary || "#D92C2C",
          mode: paletteMode,
        });
      } catch (e) {
        console.warn("Failed to generate palette:", (e as any).message);
      }
    }

    // アップロード時、任意でメタを受け付けて保存（サイドカーファイルとして）
    let uploadMeta: any = null;
    if (file) {
      await fs.ensureDir("uploads/meta");
      const metaPath = path.resolve(
        `uploads/meta/${path.basename(file.path)}.meta.json`
      );
      const payloadMeta = {
        sourceUrl: body.sourceUrl || undefined,
        owner: body.owner || undefined,
        license: body.license || undefined,
        expiresAt: body.expiresAt || undefined,
        allowedMarkets: body.allowedMarkets
          ? String(body.allowedMarkets)
              .split(",")
              .map((s: string) => s.trim())
          : undefined,
        note: body.assetNote || undefined,
      };
      uploadMeta = payloadMeta;
      await fs.writeJSON(metaPath, payloadMeta, { spaces: 2 });
    }

    // 権利チェック（ライブラリ照会→アップロードメタ順）
    let rightsWarnings: string[] = [];
    let rightsNotes: string[] = [];
    if (imgPath) {
      const libMeta = await lookupLibraryByFile(imgPath);
      const { warnings, notes } = checkRights(libMeta || uploadMeta, market);
      rightsWarnings = warnings;
      rightsNotes = notes;
    }

    // 既存の compliance と結合
    if (rightsWarnings.length) console.log(rightsWarnings.join("\n"));
    const notesCombined = [...(compliance.notes || []), ...rightsNotes];

    const result = await generateBanner({
      template: body.template || "product-hero",
      profilePath: body.profile || "./data/profiles/sample.json",
      size: { w, h },
      payload: {
        title: titleOut,
        price: body.price || undefined,
        discount: body.discount || undefined,
        badge: body.badge || undefined,
        period: body.period || undefined,
        variants: body.variants
          ? String(body.variants)
              .split(",")
              .map((s: string) => s.trim())
          : undefined,
        image: file ? path.resolve(file.path) : undefined,
        fit: (body.fit as "contain" | "cover") || "contain",
      },
      notes: notesCombined,
      colorsOverride,
      tenantId,
      metaSidecar: {
        tenantId,
        market,
        template: body.template || "product-hero",
        profile: body.profile || "./data/profiles/sample.json",
        title: titleOut,
        payload: {
          price: body.price,
          discount: body.discount,
          badge: body.badge,
          period: body.period,
        },
        sourceImage: imgPath || null,
        rights: { warnings: rightsWarnings, notes: rightsNotes, uploadMeta },
        createdAt: new Date().toISOString(),
      },
    });

    // 学習データ記録
    try {
      await updateTermStats(tenantId, body.title || "", titleOut);
    } catch (e) {
      console.warn("[terms-learn] failed:", (e as any)?.message);
    }

    res.json({
      ok: true,
      path: `/` + path.relative(path.resolve("."), result).replace(/\\/g, "/"),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ ok: false, error: e?.message ?? "unknown error" });
  }
});

// 5-3. 訂正データを保存するエンドポイント
app.post("/api/teach", (req, res) => {
  const {
    tenantId = "demo",
    input,
    model_output,
    ideal_output,
    tags,
    reason,
  } = req.body || {};
  if (!input || !ideal_output) {
    return res
      .status(400)
      .json({ ok: false, error: "input と ideal_output は必須です" });
  }
  saveTeachSample({
    tenantId,
    input,
    model_output: model_output || "",
    ideal_output,
    tags,
    reason,
  });
  res.json({ ok: true });
});

// 5-4. 嗜好フィードバック（タグ）で学習
app.post("/api/prefs/feedback", (req, res) => {
  const { tenantId = "demo", tag } = req.body || {};
  if (!tag) return res.status(400).json({ ok: false, error: "tag が必要です" });
  applyFeedback(tenantId, tag);
  res.json({ ok: true });
});

// 候補生成
app.post("/api/ab/suggest", express.json(), async (req, res) => {
  try {
    const {
      tenantId = "demo",
      market = "generic",
      n = 3,
      preset,
      size,
      profile,
      payload,
    } = req.body || {};
    const result = await suggestCandidates({
      tenantId,
      market,
      n,
      preset,
      size,
      profilePath: profile || "./data/profiles/sample.json",
      payload: payload || {},
    });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 採用（勝者）登録
app.post("/api/ab/select", express.json(), async (req, res) => {
  try {
    const {
      tenantId = "demo",
      market = "generic",
      sessionId,
      choiceId,
    } = req.body || {};
    const result = await selectWinner({
      tenantId,
      market,
      sessionId,
      choiceId,
    });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// CTR取り込み
app.post("/api/ab/ingest-ctr", express.json(), async (req, res) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const results = [];
    for (const it of items) {
      const r = await applyCtrEvent({
        tenantId: it.tenantId || "demo",
        market: it.market || "generic",
        template: it.template,
        impressions: Number(it.impressions || 0),
        clicks: Number(it.clicks || 0),
      });
      results.push({ template: it.template, ...r });
    }
    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// サジェスト取得
app.get("/api/terms/suggest", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || "demo";
    const limit = Number(req.query.limit || 20);
    const s = await suggestTerms(tenantId, limit);
    res.json({ ok: true, ...s });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 反映
app.post("/api/terms/apply", express.json(), async (req, res) => {
  try {
    const {
      tenantId = "demo",
      addKeep = [],
      addDrop = [],
      addReplace = [],
    } = req.body || {};
    const updated = await applyTermsUpdate(tenantId, {
      addKeep,
      addDrop,
      addReplace,
    });
    res.json({ ok: true, terms: updated });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 4321;
app.listen(PORT, () => {
  if (!fs.existsSync("out")) fs.mkdirSync("out", { recursive: true });
  console.log(`🚀 UI ready: http://localhost:${PORT}`);
});

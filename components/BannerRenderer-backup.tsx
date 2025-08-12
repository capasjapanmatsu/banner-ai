"use client";

import React, { useRef, useEffect, useState } from "react";
import type { BannerSpec, BackgroundEffect } from "@/types/banner";
import { toBlob } from "html-to-image";
import { renderBackgroundEffect } from "@/lib/background-effects";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLayer = any;

interface BannerRendererProps {
  spec: BannerSpec;
  productImageData?: {
    originalUrl: string;
    processedUrl: string;
    backgroundRemoved: boolean;
    backgroundEffect?: BackgroundEffect;
  } | null;
}

export default function BannerRenderer({ spec, productImageData }: BannerRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string>("");

  const { w, h } = spec.meta.size;
  const maxBytes = spec.export?.maxBytes ?? 900_000;
  const isProductMode = spec.meta.mode === "product";

  // 出品画像モードでの背景エフェクト描画
  useEffect(() => {
    if (!isProductMode || !productImageData?.backgroundEffect || !backgroundCanvasRef.current) {
      setBackgroundDataUrl("");
      return;
    }

    const canvas = backgroundCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = w;
    canvas.height = h;

    // 背景をクリア
    ctx.clearRect(0, 0, w, h);

    // 背景エフェクトを描画
    renderBackgroundEffect(ctx, productImageData.backgroundEffect, w, h);

    // CanvasをData URLに変換
    setBackgroundDataUrl(canvas.toDataURL());
  }, [isProductMode, productImageData?.backgroundEffect, w, h]);

  // PNG保存（そのまま）
  const downloadPNG = async () => {
    if (!ref.current) return;
    
    try {
      const blob = await toBlob(ref.current, { pixelRatio: 2, cacheBust: true });
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "banner.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PNG save failed:", error);
      alert("PNG保存に失敗しました");
    }
  };

  // WebP保存（品質を自動で下げて maxBytes 以内に収める）
  const downloadWebP = async () => {
    if (!ref.current) return;

    try {
      // ① まずはPNGとしてDOM→画像化
      const pngBlob = await toBlob(ref.current, { pixelRatio: 2, cacheBust: true });
      if (!pngBlob) return;

      // ② PNG→Canvasへ描画
      const bmp = await createImageBitmap(pngBlob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0);

      // ③ 品質を段階的に下げてサイズチェック
      const toBytes = (dataUrl: string) => Math.ceil((dataUrl.length * 3) / 4); // base64概算
      let q = 0.95;
      let dataUrl = canvas.toDataURL("image/webp", q);
      let bytes = toBytes(dataUrl);

      while (bytes > maxBytes && q >= 0.5) {
        q -= 0.05;
        dataUrl = canvas.toDataURL("image/webp", q);
        bytes = toBytes(dataUrl);
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "banner.webp";
      a.click();

      console.log(`WebP saved with quality: ${q.toFixed(2)}, estimated size: ${bytes} bytes`);
    } catch (error) {
      console.error("WebP save failed:", error);
      alert("WebP保存に失敗しました");
    }
  };

  return (
    <div className="w-full">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl shadow-xl bg-white"
        style={{ width: w, height: h }}
      >
        {/* 背景 */}
        {spec.layers
          .filter((l: AnyLayer) => l.type === "bg")
          .map((l: AnyLayer, i: number) => {
            const style: React.CSSProperties =
              l.style?.kind === "gradient"
                ? { background: `linear-gradient(180deg, ${l.style.from}, ${l.style.to})` }
                : { backgroundColor: l.style?.color ?? spec.palette.bg };
            return <div key={`bg-${i}`} className="absolute inset-0" style={style} />;
          })}

        {/* 画像/ロゴ */}
        {spec.layers
          .filter((l: AnyLayer) => l.type === "image" || l.type === "logo")
          .map((l: AnyLayer, i: number) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`img-${i}`}
              src={l.src}
              alt=""
              className="absolute select-none"
              // ※ 外部画像を使う場合はCORS設定必須。ローカル/自前StorageならOK
              crossOrigin="anonymous"
              style={{ left: l.x, top: l.y, width: l.w, height: l.h, opacity: l.opacity ?? 1 }}
            />
          ))}

        {/* テキスト */}
        {spec.layers
          .filter((l: AnyLayer) => l.type === "text")
          .map((l: AnyLayer, i: number) => {
            const st = l.style || {};
            const shadow =
              st.stroke?.width && st.stroke?.color
                ? `-${st.stroke.width}px 0 ${st.stroke.color},
                   ${st.stroke.width}px 0 ${st.stroke.color},
                   0 -${st.stroke.width}px ${st.stroke.color},
                   0 ${st.stroke.width}px ${st.stroke.color}`
                : undefined;
            return (
              <div
                key={`txt-${i}`}
                className="absolute"
                style={{
                  left: l.x,
                  top: l.y,
                  maxWidth: l.maxW,
                  fontFamily: st.font,
                  fontWeight: st.weight,
                  fontSize: st.size,
                  lineHeight: st.lineHeight ?? 1.1,
                  color: st.fill,
                  textShadow: shadow,
                  whiteSpace: "pre-wrap",
                }}
              >
                {l.text}
              </div>
            );
          })}

        {/* CTA */}
        {spec.layers
          .filter((l: AnyLayer) => l.type === "cta")
          .map((l: AnyLayer, i: number) => (
            <div
              key={`cta-${i}`}
              className="absolute flex items-center justify-center select-none"
              style={{
                left: l.x,
                top: l.y,
                width: l.w,
                height: l.h,
                background: l.style?.bg,
                color: l.style?.fill,
                borderRadius: l.style?.radius ?? 16,
                fontFamily: l.style?.font,
                fontWeight: l.style?.weight,
                fontSize: l.style?.size,
              }}
            >
              {l.text}
            </div>
          ))}

        {/* バッジ */}
        {spec.layers
          .filter((l: AnyLayer) => l.type === "badge")
          .map((l: AnyLayer, i: number) => (
            <div
              key={`bdg-${i}`}
              className="absolute flex items-center justify-center select-none"
              style={{
                left: l.x,
                top: l.y,
                width: l.r * 2,
                height: l.r * 2,
                borderRadius: l.r,
                background: l.style?.bg,
                color: l.style?.fill,
                fontFamily: l.style?.font,
                fontWeight: l.style?.weight,
                fontSize: l.style?.size,
              }}
            >
              {l.text}
            </div>
          ))}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={downloadPNG} className="px-3 py-1.5 rounded bg-black text-white">
          ダウンロード（PNG）
        </button>
        <button onClick={downloadWebP} className="px-3 py-1.5 rounded border">
          ダウンロード（WebP最適化）
        </button>
        <span className="text-xs text-gray-500 self-center">
          目標サイズ: {(maxBytes / 1024).toFixed(0)} KB
        </span>
      </div>
    </div>
  );
}

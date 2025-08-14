"use client";

import React, { useMemo, useRef, useState } from "react";
import type { BannerSpec } from "@/types/banner";
import { toBlob } from "html-to-image";
import Moveable from "react-moveable";
import { uid } from "@/lib/id";

type AnyLayer = any;

function cssFilter(fx?: Record<string, any>) {
  if (!fx) return undefined;
  const segs: string[] = [];
  if (fx.brightness) segs.push(`brightness(${fx.brightness})`);
  if (fx.contrast)   segs.push(`contrast(${fx.contrast})`);
  if (fx.saturation) segs.push(`saturate(${fx.saturation})`);
  if (fx.grayscale)  segs.push(`grayscale(${fx.grayscale})`);
  if (fx.blur)       segs.push(`blur(${fx.blur}px)`);
  if (fx.dropShadow) {
    const d = fx.dropShadow;
    segs.push(`drop-shadow(${d.dx}px ${d.dy}px ${d.blur}px ${d.color})`);
  }
  return segs.join(" ");
}

function cssMask(eff?: Record<string, any>) {
  if (!eff) return {};
  if (eff.kind === "ellipse") {
    const t = Math.round(((1 - (eff.feather ?? 0)) * 100));
    const grad = `radial-gradient(ellipse at center, rgba(0,0,0,1) ${t}%, rgba(0,0,0,0) 100%)`;
    return { WebkitMaskImage: grad as any, maskImage: grad as any, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" };
  }
  return {};
}

export default function BannerRenderer({
  spec,
  onChange,
  selectedLayerId,
  onSelectLayer,
}: {
  spec: BannerSpec;
  onChange: (next: BannerSpec) => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = spec.meta.size;
  const maxBytes = spec.export?.maxBytes ?? 900_000;
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // 画像レイヤーのDOM参照を保持
  const imgRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const setImgRef = (key: string) => (el: HTMLImageElement | null) => {
    imgRefs.current[key] = el;
    console.log('Setting ref for:', key, el); // デバッグログ
  };
  const targetEl = selectedLayerId ? imgRefs.current[selectedLayerId] ?? null : null;
  
  // デバッグ用ログ
  React.useEffect(() => {
    console.log('Selected layer ID:', selectedLayerId);
    console.log('Target element:', targetEl);
  }, [selectedLayerId, targetEl]);

  const [dragOver, setDragOver] = useState(false);

  // 全体的なクリック処理で選択解除
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // バナー領域外をクリックした場合は選択解除
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onSelectLayer?.(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [onSelectLayer]);

  // Shiftキーの状態を監視
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
      // Deleteキーで選択された画像を削除
      if (e.key === 'Delete' && selectedLayerId) {
        deleteLayerById(selectedLayerId);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedLayerId]);

  const imageLayers = useMemo(
    () => spec.layers
      .map((l: AnyLayer, i: number) => ({ layer: l, key: (l.id as string) ?? `idx-${i}` }))
      .filter((x) => x.layer.type === "image" || x.layer.type === "logo"),
    [spec.layers]
  );

  // PNG保存
  const downloadPNG = async () => {
    if (!ref.current) return;
    const blob = await toBlob(ref.current, { pixelRatio: 2, cacheBust: true });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "banner.png"; a.click();
    URL.revokeObjectURL(url);
  };

  // WebP保存（容量調整）
  const downloadWebP = async () => {
    if (!ref.current) return;
    const pngBlob = await toBlob(ref.current, { pixelRatio: 2, cacheBust: true });
    if (!pngBlob) return;
    const bmp = await createImageBitmap(pngBlob);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(bmp, 0, 0);
    const toBytes = (u: string) => Math.ceil((u.length * 3) / 4);
    let q = 0.95, dataUrl = canvas.toDataURL("image/webp", q);
    while (toBytes(dataUrl) > maxBytes && q >= 0.5) {
      q -= 0.05; dataUrl = canvas.toDataURL("image/webp", q);
    }
    const a = document.createElement("a"); a.href = dataUrl; a.download = "banner.webp"; a.click();
  };

  // レイヤー更新
  const updateLayerById = (id: string, patch: Partial<AnyLayer>) => {
    const next = structuredClone(spec) as BannerSpec;
    const idx = next.layers.findIndex((l: any) => (l.id ?? null) === id);
    if (idx >= 0) next.layers[idx] = { ...(next.layers[idx] as any), ...patch };
    onChange(next);
  };

  // レイヤー削除
  const deleteLayerById = (id: string) => {
    const next = structuredClone(spec) as BannerSpec;
    next.layers = next.layers.filter((l: any) => (l.id ?? null) !== id);
    onChange(next);
    onSelectLayer?.(null); // 選択解除
  };

  // 画像ファイル/URL追加
  const addImageFromFile = async (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const { x, y, width, height } = await fitCoverFromImage(blobUrl, w, h);
    const id = uid("img");
    const next = structuredClone(spec) as BannerSpec;
    (next.layers as any[]).push({ id, type: "image", src: blobUrl, x, y, w: width, h: height, opacity: 1 });
    onChange(next);
    onSelectLayer?.(id);
  };
  const addImageFromUrl = async (url: string) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const { x, y, width, height } = await fitCoverFromImage(blobUrl, w, h);
      const id = uid("img");
      const next = structuredClone(spec) as BannerSpec;
      (next.layers as any[]).push({ id, type: "image", src: blobUrl, x, y, w: width, h: height, opacity: 1 });
      onChange(next);
      onSelectLayer?.(id);
    } catch {
      alert("画像URLの取得に失敗しました。ローカル画像をドロップしてください。");
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dt = e.dataTransfer;
    const files = Array.from(dt.files ?? []).filter(f => f.type.startsWith("image/"));
    if (files.length) {
      for (const f of files) await addImageFromFile(f);
      return;
    }
    // URLドロップ対応（ブラウザや他アプリから）
    const uri = dt.getData("text/uri-list") || dt.getData("text/plain");
    if (uri && /^https?:\/\//.test(uri)) {
      await addImageFromUrl(uri.trim());
    }
  };

  return (
    <div className="w-full">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl shadow-xl bg-white select-none"
        style={{ 
          width: w, 
          height: h, 
          position: 'relative',
          transform: 'translateZ(0)', // GPU加速を有効にして描画を最適化
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(e) => {
          // 画像以外の領域をクリックした場合は選択解除
          if (e.target === e.currentTarget) {
            console.log('Banner background clicked - deselecting');
            onSelectLayer?.(null);
          }
        }}
      >
        {/* ドロップヒント */}
        {dragOver && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40" />
        )}

        {/* 背景 */}
        {spec.layers.filter((l: AnyLayer) => l.type === "bg").map((l: AnyLayer, i: number) => {
          const style: React.CSSProperties =
            l.style?.kind === "gradient"
              ? { background: `linear-gradient(180deg, ${l.style.from}, ${l.style.to})` }
              : { backgroundColor: l.style?.color ?? spec.palette.bg };
          return <div key={`bg-${i}`} className="absolute inset-0" style={style} />;
        })}

        {/* 画像/ロゴ */}
        {imageLayers.map(({ layer: l, key }) => (
          <img
            key={key}
            ref={setImgRef(key)}
            src={l.src}
            alt=""
            className={`absolute cursor-move select-none ${selectedLayerId === (l.id ?? key) ? "ring-2 ring-blue-500" : ""}`}
            crossOrigin="anonymous"
            onMouseDown={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              onSelectLayer?.((l.id ?? key) as string); 
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Image clicked - selecting:', (l.id ?? key));
              onSelectLayer?.((l.id ?? key) as string); 
            }}
            draggable={false}
            style={{
              left: l.x, 
              top: l.y, 
              width: l.w, 
              height: l.h, 
              opacity: l.opacity ?? 1,
              filter: cssFilter(l.effects?.filter),
              ...cssMask(l.effects?.mask),
              transform: l.rotate ? `rotate(${l.rotate}deg)` : undefined,
              transformOrigin: 'center center',
              pointerEvents: 'auto',
              userSelect: 'none',
              objectFit: 'cover',
              position: 'absolute',
              zIndex: selectedLayerId === (l.id ?? key) ? 10 : 1,
            }}
          />
        ))}

        {/* テキスト */}
        {spec.layers.filter((l: AnyLayer) => l.type === "text").map((l: AnyLayer, i: number) => {
          const st = l.style || {};
          const shadow =
            st.stroke?.width && st.stroke?.color
              ? `-${st.stroke.width}px 0 ${st.stroke.color},
                 ${st.stroke.width}px 0 ${st.stroke.color},
                 0 -${st.stroke.width}px ${st.stroke.color},
                 0 ${st.stroke.width}px ${st.stroke.color}`
              : undefined;
          
          // テキスト色を濃くする（薄い色の場合は濃い色に変更）
          let textColor = st.fill;
          if (!textColor || textColor === '#ffffff' || textColor === 'white' || textColor === '#f0f0f0' || textColor === '#e0e0e0') {
            textColor = '#1a1a1a'; // 濃いグレー
          } else if (textColor === '#cccccc' || textColor === '#d0d0d0' || textColor === '#c0c0c0') {
            textColor = '#2d2d2d'; // ダークグレー
          }
          
          return (
            <div
              key={`txt-${i}`} className="absolute"
              style={{
                left: l.x, top: l.y, maxWidth: l.maxW,
                fontFamily: st.font, fontWeight: st.weight || 600, fontSize: st.size,
                lineHeight: st.lineHeight ?? 1.1, color: textColor, textShadow: shadow, whiteSpace: "pre-wrap",
              }}
            >{l.text}</div>
          );
        })}

        {/* バッジ */}
        {spec.layers.filter((l: AnyLayer) => l.type === "badge").map((l: AnyLayer, i: number) => (
          <div
            key={`bdg-${i}`} className="absolute flex items-center justify-center"
            style={{
              left: l.x, top: l.y, width: l.r * 2, height: l.r * 2,
              borderRadius: l.r, background: l.style?.bg, color: l.style?.fill,
              fontFamily: l.style?.font, fontWeight: l.style?.weight, fontSize: l.style?.size,
            }}
          >{l.text}</div>
        ))}

        {/* オーバーレイ（上下ブラック・ビネット） */}
        {(spec as any).meta?.overlays?.topBlack && (
          <div className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: Math.round(h * ((spec as any).meta.overlays.topBlack as number)),
              background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)"
            }}
          />
        )}
        {(spec as any).meta?.overlays?.bottomBlack && (
          <div className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: Math.round(h * ((spec as any).meta.overlays.bottomBlack as number)),
              background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)"
            }}
          />
        )}
        {(spec as any).meta?.overlays?.vignette && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)",
              mixBlendMode: "multiply", opacity: (spec as any).meta.overlays.vignette
            }}
          />
        )}
      </div>

      {/* Moveable（選択時のみ） */}
      {selectedLayerId && targetEl && (
        <Moveable
          target={targetEl}
          draggable
          resizable
          rotatable
          scalable
          keepRatio={isShiftPressed}
          onDrag={(e) => {
            updateLayerById(selectedLayerId, { x: Math.round(e.left), y: Math.round(e.top) });
          }}
          onResize={(e) => {
            const left = Math.round(e.drag.left);
            const top = Math.round(e.drag.top);
            const width = Math.round(e.width);
            const height = Math.round(e.height);
            updateLayerById(selectedLayerId, { x: left, y: top, w: width, h: height });
          }}
          onRotate={(e) => {
            updateLayerById(selectedLayerId, { rotate: Math.round(e.rotation) });
          }}
          onScale={(e) => {
            const currentLayer = spec.layers.find((l: any) => (l.id ?? null) === selectedLayerId);
            if (currentLayer && 'w' in currentLayer && 'h' in currentLayer) {
              const newWidth = Math.round((currentLayer as any).w * e.scale[0]);
              const newHeight = Math.round((currentLayer as any).h * e.scale[1]);
              updateLayerById(selectedLayerId, { w: newWidth, h: newHeight });
            }
          }}
        />
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={downloadPNG} className="px-3 py-1.5 rounded bg-black text-white">ダウンロード（PNG）</button>
        <button onClick={downloadWebP} className="px-3 py-1.5 rounded border">ダウンロード（WebP最適化）</button>
        {selectedLayerId && (
          <button 
            onClick={() => deleteLayerById(selectedLayerId)} 
            className="px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600"
          >
            選択画像を削除
          </button>
        )}
        <span className="text-xs text-gray-500 self-center">目標: {(maxBytes/1024|0)} KB（はみ出しは自動トリミング）</span>
      </div>
      
      {/* 操作ガイド */}
      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <div className="font-medium mb-1">操作方法:</div>
        <div>• 画像をクリック: 選択状態にする</div>
        <div>• ドラッグ: 移動</div>
        <div>• 角・辺をドラッグ: リサイズ</div>
        <div>• 上部の円をドラッグ: 回転</div>
        <div>• Shift + リサイズ: 縦横比を維持</div>
        <div>• <span className="font-medium">Delete キー</span> または <span className="font-medium">削除ボタン</span>: 選択した画像を削除</div>
      </div>
    </div>
  );
}

// 画像の cover フィット（アスペクト維持で適切なサイズに配置し中央寄せ）
async function fitCoverFromImage(src: string, W: number, H: number) {
  const img = await loadImage(src);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  
  // バナー全体をカバーせず、適度なサイズに調整
  const maxSize = Math.min(W, H) * 0.6; // バナーサイズの60%を最大に
  const scale = Math.min(maxSize / iw, maxSize / ih);
  
  const width = Math.round(iw * scale);
  const height = Math.round(ih * scale);
  const x = Math.round((W - width) / 2);
  const y = Math.round((H - height) / 2);
  
  return { x, y, width, height };
}
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

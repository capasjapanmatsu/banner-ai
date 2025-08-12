"use client";

import React from "react";
import type { BannerSpec } from "@/types/banner";

interface EffectsPanelProps {
  spec: BannerSpec;
  onChange: (spec: BannerSpec) => void;
}

export default function EffectsPanel({ spec, onChange }: EffectsPanelProps) {
  // オーバーレイエフェクトの更新
  const updateOverlayEffect = (key: 'topBlack' | 'bottomBlack' | 'vignette', value: number | null) => {
    const newSpec = { ...spec };
    if (!newSpec.meta.overlays) {
      newSpec.meta.overlays = {};
    }
    
    if (value === null || value === 0) {
      delete newSpec.meta.overlays[key];
    } else {
      newSpec.meta.overlays[key] = value;
    }
    
    onChange(newSpec);
  };

  // 現在の値を取得
  const topBlack = spec.meta.overlays?.topBlack ?? 0;
  const bottomBlack = spec.meta.overlays?.bottomBlack ?? 0;
  const vignette = spec.meta.overlays?.vignette ?? 0;

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-800">画面エフェクト</h3>
      
      {/* 上部ブラックフェード */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            上部ブラックフェード
          </label>
          <span className="text-xs text-gray-500">
            {Math.round(topBlack * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.05"
          value={topBlack}
          onChange={(e) => updateOverlayEffect('topBlack', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500">
          画面上部から下向きのグラデーション
        </div>
      </div>

      {/* 下部ブラックフェード */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            下部ブラックフェード
          </label>
          <span className="text-xs text-gray-500">
            {Math.round(bottomBlack * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.05"
          value={bottomBlack}
          onChange={(e) => updateOverlayEffect('bottomBlack', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500">
          画面下部から上向きのグラデーション
        </div>
      </div>

      {/* ビネット効果 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            ビネット効果
          </label>
          <span className="text-xs text-gray-500">
            {Math.round(vignette * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={vignette}
          onChange={(e) => updateOverlayEffect('vignette', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="text-xs text-gray-500">
          中央から外側へのダークグラデーション
        </div>
      </div>

      {/* リセットボタン */}
      <div className="pt-2 border-t">
        <button
          onClick={() => {
            const newSpec = { ...spec };
            newSpec.meta.overlays = {};
            onChange(newSpec);
          }}
          className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          エフェクトをリセット
        </button>
      </div>

      {/* プリセット */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          プリセット
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const newSpec = { ...spec };
              newSpec.meta.overlays = {
                topBlack: 0.3,
                bottomBlack: 0.2,
                vignette: 0.4
              };
              onChange(newSpec);
            }}
            className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
          >
            映画風
          </button>
          <button
            onClick={() => {
              const newSpec = { ...spec };
              newSpec.meta.overlays = {
                vignette: 0.6
              };
              onChange(newSpec);
            }}
            className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
          >
            ビンテージ
          </button>
          <button
            onClick={() => {
              const newSpec = { ...spec };
              newSpec.meta.overlays = {
                topBlack: 0.4
              };
              onChange(newSpec);
            }}
            className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
          >
            夕焼け
          </button>
          <button
            onClick={() => {
              const newSpec = { ...spec };
              newSpec.meta.overlays = {
                bottomBlack: 0.35
              };
              onChange(newSpec);
            }}
            className="px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
          >
            ドラマチック
          </button>
        </div>
      </div>
    </div>
  );
}

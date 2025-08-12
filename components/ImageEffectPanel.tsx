// components/ImageEffectPanel.tsx
'use client';

import { useState } from 'react';
import type { ImageEffects } from '@/types/banner';
import { imageEffectPresets, adjustEffectIntensity, getEffectDescription } from '@/lib/image-effects';

interface ImageEffectPanelProps {
  onEffectChange: (effect: ImageEffects | null) => void;
  currentEffect?: ImageEffects | null;
  previewImage?: string;
}

export default function ImageEffectPanel({
  onEffectChange,
  currentEffect,
  previewImage,
}: ImageEffectPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('none');
  const [intensity, setIntensity] = useState<number>(1.0);

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    
    if (presetKey === 'none') {
      onEffectChange(null);
    } else {
      const baseEffect = imageEffectPresets[presetKey];
      const adjustedEffect = adjustEffectIntensity(baseEffect, intensity);
      onEffectChange(adjustedEffect);
    }
  };

  const handleIntensityChange = (newIntensity: number) => {
    setIntensity(newIntensity);
    
    if (selectedPreset !== 'none' && imageEffectPresets[selectedPreset]) {
      const baseEffect = imageEffectPresets[selectedPreset];
      const adjustedEffect = adjustEffectIntensity(baseEffect, newIntensity);
      onEffectChange(adjustedEffect);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">画像エフェクト</h3>
        
        {/* プリセット選択 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handlePresetSelect('none')}
            className={`p-2 text-xs border rounded ${
              selectedPreset === 'none' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300'
            }`}
          >
            なし
          </button>
          
          {Object.entries(imageEffectPresets).map(([key]) => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              className={`p-2 text-xs border rounded ${
                selectedPreset === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300'
              }`}
            >
              {getPresetName(key)}
            </button>
          ))}
        </div>
        
        {/* 強度調整 */}
        {selectedPreset !== 'none' && (
          <div className="space-y-2">
            <label className="text-xs text-gray-600">エフェクト強度: {intensity.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={intensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>
      
      {/* プレビュー */}
      {previewImage && currentEffect && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">プレビュー</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* 元画像 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">元画像</div>
              <div className="relative w-full h-20 bg-gray-100 rounded border">
                <img
                  src={previewImage}
                  alt="元画像"
                  className="w-full h-full object-contain rounded"
                />
              </div>
            </div>
            
            {/* エフェクト適用後 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">エフェクト後</div>
              <div className="relative w-full h-20 bg-gray-100 rounded border">
                <img
                  src={previewImage}
                  alt="エフェクト適用後"
                  className="w-full h-full object-contain rounded"
                  style={{
                    filter: currentEffect.filter ? 
                      Object.entries(currentEffect.filter)
                        .map(([key, value]) => {
                          if (key === 'dropShadow' && value && typeof value === 'object') {
                            return `drop-shadow(${value.dx}px ${value.dy}px ${value.blur}px ${value.color})`;
                          }
                          if (typeof value === 'number') {
                            return `${key}(${value}${key === 'blur' ? 'px' : ''})`;
                          }
                          return '';
                        })
                        .filter(Boolean)
                        .join(' ') : undefined,
                    clipPath: currentEffect.mask?.kind === 'ellipse' ? 
                      `ellipse(${50 - (currentEffect.mask.feather || 0) * 50}% ${50 - (currentEffect.mask.feather || 0) * 50}% at center)` :
                      currentEffect.mask?.kind === 'rect' ?
                      `inset(${(currentEffect.mask.feather || 0) * 50}% ${(currentEffect.mask.feather || 0) * 50}% ${(currentEffect.mask.feather || 0) * 50}% ${(currentEffect.mask.feather || 0) * 50}% round ${(currentEffect.mask.feather || 0) * 100}px)` :
                      undefined
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 現在のエフェクト詳細 */}
      {currentEffect && (
        <div className="p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium">適用中:</div>
          <div>{getEffectDescription(currentEffect)}</div>
        </div>
      )}
    </div>
  );
}

function getPresetName(key: string): string {
  const names: Record<string, string> = {
    bright: '明るく',
    dark: '暗く',
    vivid: '鮮やか',
    vintage: 'ヴィンテージ',
    blackAndWhite: '白黒',
    soft: 'ソフト',
    dramatic: 'ドラマチック',
    circle: '円形',
    circleShoft: '円形ソフト',
    rounded: '角丸',
    vintageCircle: 'ヴィンテージ円',
    dramaticRounded: 'ドラマ角丸',
  };
  return names[key] || key;
}

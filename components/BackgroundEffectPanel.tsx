// components/BackgroundEffectPanel.tsx
'use client';

import { useState } from 'react';
import type { BackgroundEffect } from '@/types/banner';
import { backgroundEffectPresets } from '@/lib/background-effects';

interface BackgroundEffectPanelProps {
  onEffectChange: (effect: BackgroundEffect | null) => void;
  currentEffect?: BackgroundEffect | null;
}

export default function BackgroundEffectPanel({
  onEffectChange,
  currentEffect,
}: BackgroundEffectPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('none');

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    
    if (presetKey === 'none') {
      onEffectChange(null);
    } else {
      onEffectChange(backgroundEffectPresets[presetKey]);
    }
  };

  const handleCustomColor = (color: string) => {
    onEffectChange({
      type: 'color',
      color,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">背景エフェクト</h3>
        
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
          
          {Object.entries(backgroundEffectPresets).map(([key]) => (
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
        
        {/* カスタムカラー */}
        <div className="flex items-center gap-2">
          <label className="text-xs">カスタム色:</label>
          <input
            type="color"
            className="w-8 h-8 border rounded"
            onChange={(e) => handleCustomColor(e.target.value)}
          />
        </div>
      </div>
      
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
    sunset: '夕焼け',
    ocean: '海',
    forest: '森',
    dots: 'ドット',
    lines: 'ライン',
    white: '白',
    black: '黒',
    gray: 'グレー',
  };
  return names[key] || key;
}

function getEffectDescription(effect: BackgroundEffect): string {
  switch (effect.type) {
    case 'gradient':
      return `グラデーション (${effect.gradient?.type || 'linear'})`;
    case 'pattern':
      return `パターン (${effect.pattern?.type || 'unknown'})`;
    case 'color':
      return `単色 (${effect.color})`;
    case 'shadow':
      return 'シャドウ';
    case 'blur':
      return 'ぼかし';
    default:
      return 'カスタム';
  }
}

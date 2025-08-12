// lib/background-effects.ts
import type { BackgroundEffect } from '@/types/banner';

/**
 * 背景エフェクトをCanvas上に描画する
 * @param ctx Canvas 2Dコンテキスト
 * @param effect 背景エフェクト設定
 * @param width キャンバス幅
 * @param height キャンバス高さ
 */
export function renderBackgroundEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  width: number,
  height: number
): void {
  switch (effect.type) {
    case 'gradient':
      renderGradientEffect(ctx, effect, width, height);
      break;
    case 'pattern':
      renderPatternEffect(ctx, effect, width, height);
      break;
    case 'shadow':
      renderShadowEffect(ctx, effect, width, height);
      break;
    case 'blur':
      renderBlurEffect(ctx, effect, width, height);
      break;
    case 'color':
      renderColorEffect(ctx, effect, width, height);
      break;
  }
}

function renderGradientEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  width: number,
  height: number
): void {
  if (!effect.gradient) return;

  let gradient: CanvasGradient;

  if (effect.gradient.type === 'radial') {
    gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
  } else {
    // linear gradient
    const angle = (effect.gradient.direction || 0) * Math.PI / 180;
    const x1 = width / 2 - Math.cos(angle) * width / 2;
    const y1 = height / 2 - Math.sin(angle) * height / 2;
    const x2 = width / 2 + Math.cos(angle) * width / 2;
    const y2 = height / 2 + Math.sin(angle) * height / 2;
    gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  }

  effect.gradient.colors.forEach((color, index) => {
    gradient.addColorStop(index / (effect.gradient!.colors.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function renderPatternEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  width: number,
  height: number
): void {
  if (!effect.pattern) return;

  ctx.globalAlpha = effect.pattern.opacity;
  ctx.fillStyle = effect.pattern.color;

  const size = effect.pattern.size;

  switch (effect.pattern.type) {
    case 'dots':
      for (let x = size; x < width; x += size * 2) {
        for (let y = size; y < height; y += size * 2) {
          ctx.beginPath();
          ctx.arc(x, y, size / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'lines':
      ctx.lineWidth = 2;
      ctx.strokeStyle = effect.pattern.color;
      for (let x = 0; x < width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      break;
    case 'grid':
      ctx.lineWidth = 1;
      ctx.strokeStyle = effect.pattern.color;
      for (let x = 0; x < width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
  }

  ctx.globalAlpha = 1;
}

function renderShadowEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  _width: number,
  _height: number
): void {
  if (!effect.shadow) return;

  ctx.shadowColor = effect.shadow.color;
  ctx.shadowBlur = effect.shadow.blur;
  ctx.shadowOffsetX = effect.shadow.x;
  ctx.shadowOffsetY = effect.shadow.y;
}

function renderBlurEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  _width: number,
  _height: number
): void {
  if (!effect.blur) return;

  ctx.filter = `blur(${effect.blur.radius}px)`;
}

function renderColorEffect(
  ctx: CanvasRenderingContext2D,
  effect: BackgroundEffect,
  width: number,
  height: number
): void {
  if (!effect.color) return;

  ctx.fillStyle = effect.color;
  ctx.fillRect(0, 0, width, height);
}

/**
 * プリセット背景エフェクトを生成
 */
export const backgroundEffectPresets: Record<string, BackgroundEffect> = {
  // グラデーション系
  sunset: {
    type: 'gradient',
    gradient: {
      type: 'linear',
      colors: ['#ff7e5f', '#feb47b'],
      direction: 45,
    },
  },
  ocean: {
    type: 'gradient',
    gradient: {
      type: 'linear',
      colors: ['#2E86AB', '#A23B72', '#F18F01'],
      direction: 135,
    },
  },
  forest: {
    type: 'gradient',
    gradient: {
      type: 'radial',
      colors: ['#4ecdc4', '#44a08d'],
    },
  },
  
  // パターン系
  dots: {
    type: 'pattern',
    pattern: {
      type: 'dots',
      color: '#ffffff',
      size: 20,
      opacity: 0.3,
    },
  },
  lines: {
    type: 'pattern',
    pattern: {
      type: 'lines',
      color: '#000000',
      size: 15,
      opacity: 0.1,
    },
  },
  
  // 単色系
  white: {
    type: 'color',
    color: '#ffffff',
  },
  black: {
    type: 'color',
    color: '#000000',
  },
  gray: {
    type: 'color',
    color: '#f5f5f5',
  },
};

/**
 * 商品に適した背景エフェクトを自動提案
 * @param imageColors 商品画像から抽出された色
 * @returns おすすめの背景エフェクト
 */
export function suggestBackgroundEffect(imageColors: string[]): BackgroundEffect {
  // 主要色を分析して適切な背景を提案
  const dominantColor = imageColors[0];
  
  if (!dominantColor) {
    return backgroundEffectPresets.white;
  }

  // RGB値を取得
  const rgb = hexToRgb(dominantColor);
  if (!rgb) return backgroundEffectPresets.white;

  const { r, g, b } = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 明るい色なら暗い背景、暗い色なら明るい背景
  if (brightness > 128) {
    return {
      type: 'gradient',
      gradient: {
        type: 'radial',
        colors: ['#2c3e50', '#34495e'],
      },
    };
  } else {
    return {
      type: 'gradient',
      gradient: {
        type: 'radial',
        colors: ['#ecf0f1', '#bdc3c7'],
      },
    };
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

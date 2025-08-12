// lib/image-effects.ts
import type { FilterFX, ImageEffects } from '@/types/banner';

/**
 * FilterFXをCSS filterプロパティの文字列に変換
 * @param filter FilterFX設定
 * @returns CSS filter文字列
 */
export function filterFXToCSS(filter: FilterFX): string {
  const filters: string[] = [];

  if (filter.brightness !== undefined) {
    filters.push(`brightness(${filter.brightness})`);
  }
  
  if (filter.contrast !== undefined) {
    filters.push(`contrast(${filter.contrast})`);
  }
  
  if (filter.saturation !== undefined) {
    filters.push(`saturate(${filter.saturation})`);
  }
  
  if (filter.blur !== undefined) {
    filters.push(`blur(${filter.blur}px)`);
  }
  
  if (filter.grayscale !== undefined) {
    filters.push(`grayscale(${filter.grayscale})`);
  }
  
  if (filter.dropShadow) {
    const { dx, dy, blur, color } = filter.dropShadow;
    filters.push(`drop-shadow(${dx}px ${dy}px ${blur}px ${color})`);
  }

  return filters.join(' ');
}

/**
 * ImageEffectsをCSSスタイルオブジェクトに変換
 * @param effects ImageEffects設定
 * @returns CSSスタイルオブジェクト
 */
export function imageEffectsToStyle(effects: ImageEffects): React.CSSProperties {
  const style: React.CSSProperties = {};

  // フィルター効果を適用
  if (effects.filter) {
    const filterCSS = filterFXToCSS(effects.filter);
    if (filterCSS) {
      style.filter = filterCSS;
    }
  }

  // マスク効果を適用
  if (effects.mask) {
    const { kind, feather = 0 } = effects.mask;
    
    if (kind === "ellipse") {
      // 楕円形マスク
      const inset = feather * 50; // featherを%に変換
      style.clipPath = `ellipse(${50 - inset}% ${50 - inset}% at center)`;
    } else if (kind === "rect") {
      // 矩形マスク（フェザー効果付き）
      const inset = feather * 50;
      style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}% round ${feather * 100}px)`;
    }
  }

  return style;
}

/**
 * プリセット画像エフェクト
 */
export const imageEffectPresets: Record<string, ImageEffects> = {
  // フィルター系
  bright: {
    filter: { brightness: 1.3, contrast: 1.1 }
  },
  dark: {
    filter: { brightness: 0.7, contrast: 1.2 }
  },
  vivid: {
    filter: { saturation: 1.5, contrast: 1.2 }
  },
  vintage: {
    filter: { saturation: 0.8, brightness: 1.1, contrast: 0.9 }
  },
  blackAndWhite: {
    filter: { grayscale: 1, contrast: 1.2 }
  },
  soft: {
    filter: { blur: 1, brightness: 1.1 }
  },
  dramatic: {
    filter: { 
      contrast: 1.5, 
      saturation: 1.2,
      dropShadow: { dx: 0, dy: 8, blur: 16, color: "rgba(0,0,0,0.3)" }
    }
  },
  
  // マスク系
  circle: {
    mask: { kind: "ellipse", feather: 0 }
  },
  circleShoft: {
    mask: { kind: "ellipse", feather: 0.1 }
  },
  rounded: {
    mask: { kind: "rect", feather: 0.1 }
  },
  
  // 組み合わせ
  vintageCircle: {
    filter: { saturation: 0.8, brightness: 1.1, contrast: 0.9 },
    mask: { kind: "ellipse", feather: 0.05 }
  },
  dramaticRounded: {
    filter: { 
      contrast: 1.4, 
      saturation: 1.1,
      dropShadow: { dx: 0, dy: 4, blur: 12, color: "rgba(0,0,0,0.25)" }
    },
    mask: { kind: "rect", feather: 0.08 }
  }
};

/**
 * エフェクトの強度を調整
 * @param effects 元のエフェクト
 * @param intensity 強度 (0.0 - 2.0)
 * @returns 調整されたエフェクト
 */
export function adjustEffectIntensity(effects: ImageEffects, intensity: number): ImageEffects {
  if (!effects.filter) return effects;

  const adjustedFilter: FilterFX = {};
  
  if (effects.filter.brightness !== undefined) {
    // 1.0を基準として強度を調整
    const diff = effects.filter.brightness - 1.0;
    adjustedFilter.brightness = 1.0 + (diff * intensity);
  }
  
  if (effects.filter.contrast !== undefined) {
    const diff = effects.filter.contrast - 1.0;
    adjustedFilter.contrast = 1.0 + (diff * intensity);
  }
  
  if (effects.filter.saturation !== undefined) {
    const diff = effects.filter.saturation - 1.0;
    adjustedFilter.saturation = 1.0 + (diff * intensity);
  }
  
  if (effects.filter.blur !== undefined) {
    adjustedFilter.blur = effects.filter.blur * intensity;
  }
  
  if (effects.filter.grayscale !== undefined) {
    adjustedFilter.grayscale = effects.filter.grayscale * intensity;
  }
  
  if (effects.filter.dropShadow) {
    adjustedFilter.dropShadow = {
      ...effects.filter.dropShadow,
      blur: effects.filter.dropShadow.blur * intensity,
      dx: effects.filter.dropShadow.dx * intensity,
      dy: effects.filter.dropShadow.dy * intensity,
    };
  }

  return {
    ...effects,
    filter: adjustedFilter
  };
}

/**
 * エフェクトの説明テキストを生成
 * @param effects ImageEffects
 * @returns 説明文
 */
export function getEffectDescription(effects: ImageEffects): string {
  const descriptions: string[] = [];
  
  if (effects.filter) {
    const { brightness, contrast, saturation, blur, grayscale, dropShadow } = effects.filter;
    
    if (brightness !== undefined && brightness !== 1) {
      descriptions.push(brightness > 1 ? '明るく' : '暗く');
    }
    if (contrast !== undefined && contrast !== 1) {
      descriptions.push(contrast > 1 ? 'コントラスト強' : 'コントラスト弱');
    }
    if (saturation !== undefined && saturation !== 1) {
      descriptions.push(saturation > 1 ? '鮮やか' : 'くすんだ');
    }
    if (blur !== undefined && blur > 0) {
      descriptions.push('ぼかし');
    }
    if (grayscale !== undefined && grayscale > 0) {
      descriptions.push('白黒');
    }
    if (dropShadow) {
      descriptions.push('影付き');
    }
  }
  
  if (effects.mask) {
    if (effects.mask.kind === 'ellipse') {
      descriptions.push('円形マスク');
    } else if (effects.mask.kind === 'rect') {
      descriptions.push('角丸マスク');
    }
  }
  
  return descriptions.length > 0 ? descriptions.join('・') : 'エフェクトなし';
}

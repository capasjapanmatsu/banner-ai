// lib/background-removal.ts
import { removeBackground } from '@imgly/background-removal';

export interface BackgroundRemovalOptions {
  model?: 'isnet' | 'isnet_fp16' | 'isnet_quint8';
  output?: {
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
  };
  progress?: (key: string, current: number, total: number) => void;
}

/**
 * 画像の背景を除去する
 * @param imageSource File、Blob、またはHTMLImageElement
 * @param options 背景除去のオプション
 * @returns 背景除去された画像のBlob
 */
export async function removeImageBackground(
  imageSource: File | Blob | HTMLImageElement,
  options: BackgroundRemovalOptions = {}
): Promise<Blob> {
  try {
    const blob = await removeBackground(imageSource, {
      model: options.model || 'isnet',
      output: {
        format: options.output?.format || 'image/png',
        quality: options.output?.quality || 0.9,
      },
      progress: options.progress,
    });
    
    return blob;
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error('背景除去に失敗しました。画像を確認してください。');
  }
}

/**
 * BlobをData URLに変換
 * @param blob 変換するBlob
 * @returns Data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * ファイルが背景除去に適しているかチェック
 * @param file チェックするファイル
 * @returns 適している場合true
 */
export function isValidImageForBackgroundRemoval(file: File): boolean {
  // サポートする画像形式
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  // ファイルサイズ制限（10MB）
  const maxSize = 10 * 1024 * 1024;
  
  return supportedTypes.includes(file.type) && file.size <= maxSize;
}

/**
 * 進捗コールバックのデフォルト実装
 * @param onProgress 進捗更新コールバック
 * @returns 進捗コールバック関数
 */
export function createProgressCallback(
  onProgress?: (progress: number) => void
) {
  return (key: string, current: number, total: number) => {
    const progress = Math.round((current / total) * 100);
    console.log(`Background removal progress: ${progress}%`);
    onProgress?.(progress);
  };
}

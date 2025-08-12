// components/ProductImageUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { removeImageBackground, blobToDataURL, isValidImageForBackgroundRemoval, createProgressCallback } from '@/lib/background-removal';
import BackgroundEffectPanel from './BackgroundEffectPanel';
import type { BackgroundEffect } from '@/types/banner';

interface ProductImageUploadProps {
  onImageProcessed: (data: {
    originalUrl: string;
    processedUrl: string;
    backgroundRemoved: boolean;
    backgroundEffect?: BackgroundEffect;
  }) => void;
  onError: (error: string) => void;
}

export default function ProductImageUpload({
  onImageProcessed,
  onError,
}: ProductImageUploadProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect | null>(null);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isValidImageForBackgroundRemoval(file)) {
      onError('対応していないファイル形式またはファイルサイズが大きすぎます（10MB以下）');
      return;
    }

    // 元画像を表示
    const originalUrl = URL.createObjectURL(file);
    setOriginalImage(originalUrl);
    setProcessedImage(null);
    setBackgroundRemoved(false);
    setProgress(0);

    // 背景除去を実行
    setIsProcessing(true);
    try {
      const progressCallback = createProgressCallback(setProgress);
      const resultBlob = await removeImageBackground(file, {
        model: 'isnet',
        progress: progressCallback,
      });

      const processedUrl = await blobToDataURL(resultBlob);
      setProcessedImage(processedUrl);
      setBackgroundRemoved(true);

      // 結果を親コンポーネントに通知
      onImageProcessed({
        originalUrl,
        processedUrl,
        backgroundRemoved: true,
        backgroundEffect: backgroundEffect || undefined,
      });

    } catch (error) {
      console.error('Background removal error:', error);
      onError('背景除去に失敗しました。別の画像をお試しください。');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [backgroundEffect, onImageProcessed, onError]);

  const handleEffectChange = useCallback((effect: BackgroundEffect | null) => {
    setBackgroundEffect(effect);
    
    // エフェクトが変更されたら結果を更新
    if (originalImage && processedImage) {
      onImageProcessed({
        originalUrl: originalImage,
        processedUrl: processedImage,
        backgroundRemoved,
        backgroundEffect: effect || undefined,
      });
    }
  }, [originalImage, processedImage, backgroundRemoved, onImageProcessed]);

  const resetImages = useCallback(() => {
    if (originalImage) URL.revokeObjectURL(originalImage);
    if (processedImage && processedImage.startsWith('blob:')) {
      URL.revokeObjectURL(processedImage);
    }
    
    setOriginalImage(null);
    setProcessedImage(null);
    setBackgroundRemoved(false);
    setBackgroundEffect(null);
    setProgress(0);
  }, [originalImage, processedImage]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">出品画像アップロード</h3>
        
        {/* ファイル選択 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
            id="product-image-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="product-image-upload"
            className="cursor-pointer block text-center"
          >
            <div className="text-gray-600">
              {isProcessing ? (
                <div>
                  <div className="text-sm">背景除去中...</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs mt-1">{progress}%</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm">商品画像をアップロード</div>
                  <div className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WebP (10MB以下)
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* 画像プレビュー */}
      {(originalImage || processedImage) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">プレビュー</h4>
            <button
              onClick={resetImages}
              className="text-xs text-red-600 hover:text-red-800"
            >
              リセット
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {/* 元画像 */}
            {originalImage && (
              <div>
                <div className="text-xs text-gray-600 mb-1">元画像</div>
                <div className="relative w-full h-32 bg-gray-100 rounded border">
                  <Image
                    src={originalImage}
                    alt="元画像"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              </div>
            )}
            
            {/* 処理済み画像 */}
            {processedImage && (
              <div>
                <div className="text-xs text-gray-600 mb-1">
                  背景除去済み
                  {backgroundEffect && ` (${backgroundEffect.type})`}
                </div>
                <div className="relative w-full h-32 bg-gray-100 rounded border">
                  <Image
                    src={processedImage}
                    alt="背景除去済み"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 背景エフェクト設定 */}
      {backgroundRemoved && (
        <BackgroundEffectPanel
          onEffectChange={handleEffectChange}
          currentEffect={backgroundEffect}
        />
      )}
    </div>
  );
}

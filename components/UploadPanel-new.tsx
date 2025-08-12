"use client";

import { UploadedFile, ExtractResult } from "@/types/banner";
import { useRef, useState } from "react";
import Image from "next/image";
import ProductImageUpload from "./ProductImageUpload";
import type { BackgroundEffect } from "@/types/banner";

interface UploadPanelProps {
  files: UploadedFile[];
  onFileUpload: (file: File, type: "reference" | "product" | "logo") => void;
  onExtractResult: (result: ExtractResult) => void;
  mode?: "banner" | "product";
  onModeChange?: (mode: "banner" | "product") => void;
  onProductImageProcessed?: (data: {
    originalUrl: string;
    processedUrl: string;
    backgroundRemoved: boolean;
    backgroundEffect?: BackgroundEffect;
  }) => void;
}

export default function UploadPanel({ 
  files, 
  onFileUpload, 
  onExtractResult,
  mode = "banner",
  onModeChange,
  onProductImageProcessed,
}: UploadPanelProps) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractColorsAndFonts = async (file: File) => {
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const base64 = await convertFileToBase64(file);
      formData.append("base64", base64);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: ExtractResult = await response.json();
        onExtractResult(result);
      } else {
        console.error("Color extraction failed");
        onExtractResult({ colors: [], fontCandidates: [] });
      }
    } catch (error) {
      console.error("Extract error:", error);
      onExtractResult({ colors: [], fontCandidates: [] });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "reference" | "product" | "logo"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file, type);
      
      if (type === "reference") {
        await extractColorsAndFonts(file);
      }
    }
  };

  const getFileByType = (type: "reference" | "product" | "logo") => {
    return files.find((f) => f.type === type);
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">ファイルアップロード</h3>
        
        {onModeChange && (
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => onModeChange("banner")}
              className={`px-3 py-1 text-xs ${
                mode === "banner"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              バナーモード
            </button>
            <button
              onClick={() => onModeChange("product")}
              className={`px-3 py-1 text-xs ${
                mode === "product"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              出品画像モード
            </button>
          </div>
        )}
      </div>

      {mode === "product" && onProductImageProcessed && (
        <ProductImageUpload
          onImageProcessed={onProductImageProcessed}
          onError={(error) => console.error(error)}
        />
      )}

      {mode === "banner" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              参考バナー画像
            </label>
            <input
              ref={referenceInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileChange(e, "reference")}
              className="hidden"
            />
            <button
              onClick={() => referenceInputRef.current?.click()}
              disabled={isExtracting}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50"
            >
              {isExtracting ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <span className="text-gray-500">抽出中...</span>
                </div>
              ) : getFileByType("reference") ? (
                <div className="space-y-2">
                  <Image
                    src={getFileByType("reference")?.url || ""}
                    alt="参考バナー"
                    width={300}
                    height={120}
                    className="w-full h-24 object-cover rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {getFileByType("reference")?.file.name}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">参考バナーをアップロード</span>
              )}
            </button>
            
            {getFileByType("reference") && !isExtracting && (
              <button
                onClick={() => {
                  const file = getFileByType("reference")?.file;
                  if (file) extractColorsAndFonts(file);
                }}
                className="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                色・フォントを抽出
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              商品写真
            </label>
            <input
              ref={productInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileChange(e, "product")}
              className="hidden"
            />
            <button
              onClick={() => productInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
            >
              {getFileByType("product") ? (
                <div className="space-y-2">
                  <Image
                    src={getFileByType("product")?.url || ""}
                    alt="商品写真"
                    width={300}
                    height={120}
                    className="w-full h-24 object-cover rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {getFileByType("product")?.file.name}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">商品写真をアップロード</span>
              )}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              ロゴ画像（オプション）
            </label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileChange(e, "logo")}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
            >
              {getFileByType("logo") ? (
                <div className="space-y-2">
                  <Image
                    src={getFileByType("logo")?.url || ""}
                    alt="ロゴ"
                    width={300}
                    height={120}
                    className="w-full h-24 object-cover rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {getFileByType("logo")?.file.name}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">ロゴをアップロード</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

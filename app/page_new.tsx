"use client";

import { useState } from "react";
import { BannerSpec, UploadedFile, ExtractResult, PresetConfig } from "@/types/banner";
import { PRESET_CONFIGS, createDefaultSpec } from "@/lib/spec-presets";
import UploadPanel from "@/components/UploadPanel";
import ChatPanel from "@/components/ChatPanel";
import BannerRenderer from "@/components/BannerRenderer";

export default function Home() {
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig>(PRESET_CONFIGS[0]);
  const [bannerSpec, setBannerSpec] = useState<BannerSpec>(createDefaultSpec(PRESET_CONFIGS[0]));
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [extractResult, setExtractResult] = useState<ExtractResult>();

  const handlePresetChange = (preset: PresetConfig) => {
    setSelectedPreset(preset);
    setBannerSpec(createDefaultSpec(preset));
  };

  const handleFileUpload = (file: File, type: "reference" | "product" | "logo") => {
    const url = URL.createObjectURL(file);
    const uploadedFile: UploadedFile = { file, url, type };
    
    setUploadedFiles(prev => [
      ...prev.filter(f => f.type !== type),
      uploadedFile
    ]);

    // 商品画像がアップロードされた場合、バナーに追加
    if (type === "product") {
      const newSpec = { ...bannerSpec };
      const existingImageLayer = newSpec.layers.find(layer => layer.type === "image");
      
      if (existingImageLayer && existingImageLayer.type === "image") {
        existingImageLayer.src = url;
      } else {
        newSpec.layers.push({
          id: "product-image",
          type: "image",
          src: url,
          x: 200,
          y: 200,
          w: 200,
          h: 200,
          opacity: 1,
        });
      }
      setBannerSpec(newSpec);
    }

    // ロゴがアップロードされた場合、バナーに追加
    if (type === "logo") {
      const newSpec = { ...bannerSpec };
      const existingLogoLayer = newSpec.layers.find(layer => layer.type === "logo");
      
      if (existingLogoLayer && existingLogoLayer.type === "logo") {
        existingLogoLayer.src = url;
      } else {
        newSpec.layers.push({
          id: "logo",
          type: "logo",
          src: url,
          x: 20,
          y: 20,
          w: 80,
          h: 40,
          opacity: 1,
        });
      }
      setBannerSpec(newSpec);
    }
  };

  const handleExtractColors = async (file: File) => {
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: JSON.stringify({ file: file.name }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setExtractResult(result);
      }
    } catch (error) {
      console.error("Color extraction failed:", error);
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        body: JSON.stringify({ 
          message, 
          currentSpec: bannerSpec 
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setBannerSpec(result.spec);
      }
    } catch (error) {
      console.error("Message processing failed:", error);
    }
  };

  const handleDownload = (format: "png" | "webp") => {
    console.log(`Downloaded as ${format}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">バナーAI</h1>
          <p className="text-sm text-gray-600">日本のネットショッピング向けバナー生成ツール</p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左ペイン */}
        <div className="w-[360px] bg-white border-r flex flex-col">
          {/* プリセット選択 */}
          <div className="p-4 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プリセット選択
            </label>
            <select
              value={selectedPreset.platform}
              onChange={(e) => {
                const preset = PRESET_CONFIGS.find(p => p.platform === e.target.value);
                if (preset) handlePresetChange(preset);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PRESET_CONFIGS.map((config) => (
                <option key={config.platform} value={config.platform}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* ファイルアップロード */}
          <div className="flex-1 overflow-y-auto">
            <UploadPanel
              files={uploadedFiles}
              onFileUpload={handleFileUpload}
              onExtractColors={handleExtractColors}
            />
          </div>

          {/* チャットパネル */}
          <ChatPanel
            extractResult={extractResult}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* 右ペイン */}
        <div className="flex-1 p-8 overflow-y-auto">
          <BannerRenderer
            spec={bannerSpec}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>
  );
}

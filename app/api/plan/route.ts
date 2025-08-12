import { NextRequest, NextResponse } from "next/server";
import { BannerSpec } from "@/types/banner";

export async function POST(request: NextRequest) {
  try {
    const { prompt, platform, size } = await request.json();
    
    // 固定のBannerSpecを返す（見出し/サブ/CTAにpromptを挿入）
    const fixedSpec: BannerSpec = {
      meta: {
        platform: platform || "rakuten",
        size: size || { w: 800, h: 800 },
      },
      palette: {
        bg: "#E8F3FF",
        primary: "#0E5CAD", 
        accent: "#FF3B30",
      },
      layers: [
        {
          id: "bg",
          type: "bg",
          x: 0,
          y: 0,
          color: "#E8F3FF",
        },
        {
          id: "headline",
          type: "text",
          text: prompt || "メインタイトル",
          x: 40,
          y: 80,
          maxW: (size?.w || 800) - 80,
          style: {
            font: "Noto Sans JP",
            weight: "bold",
            size: Math.min(48, (size?.w || 800) / 16),
            fill: "#0E5CAD",
          },
        },
        {
          id: "subtitle",
          type: "text",
          text: `${prompt || "サブタイトル"}の詳細説明`,
          x: 40,
          y: 160,
          maxW: (size?.w || 800) - 80,
          style: {
            font: "BIZ UDPGothic",
            weight: "normal",
            size: Math.min(24, (size?.w || 800) / 24),
            fill: "#333333",
          },
        },
        {
          id: "cta",
          type: "cta",
          text: `${prompt || "商品"}を購入`,
          x: (size?.w || 800) - 200,
          y: (size?.h || 800) - 80,
          w: 160,
          h: 50,
          style: {
            bg: "#FF3B30",
            fill: "#ffffff",
            font: "Zen Kaku Gothic New",
            weight: "bold",
            size: 18,
            radius: 8,
          },
        },
      ],
      export: {
        format: "png",
        quality: 0.9,
        maxBytes: 500 * 1024,
      },
    };

    return NextResponse.json({ spec: fixedSpec });
  } catch (error) {
    console.error("Plan API error:", error);
    return NextResponse.json(
      { error: "指示の処理に失敗しました" },
      { status: 500 }
    );
  }
}

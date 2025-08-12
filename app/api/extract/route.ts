import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // FormDataを受け取るが、画像は無視してOK
    await request.formData();
    
    // 固定の分析結果を返す
    const result = {
      colors: ["#E8F3FF", "#0E5CAD", "#FF3B30"],
      fontCandidates: ["Noto Sans JP", "BIZ UDPGothic", "Zen Kaku Gothic New"]
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Extract API error:", error);
    return NextResponse.json(
      { error: "画像の分析に失敗しました" },
      { status: 500 }
    );
  }
}

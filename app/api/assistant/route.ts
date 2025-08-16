// app/api/assistant/route.ts
import { NextResponse } from "next/server";
import { decide } from "@/lib/assistant";
import type { DesignBrief } from "@/types/assistant";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // バリデーション
    if (!body.brief) {
      return NextResponse.json(
        { error: "brief is required", ok: false },
        { status: 400 }
      );
    }

    // body: { brief: Partial<DesignBrief> }
    const brief = body.brief as Partial<DesignBrief>;
    
    // ここで将来、OCRや色抽出結果をマージしてから decide() に渡す
    const decision = decide(brief);
    
    return NextResponse.json({
      ok: true,
      decision,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error", ok: false },
      { status: 500 }
    );
  }
}

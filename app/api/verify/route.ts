import { NextRequest, NextResponse } from 'next/server';

// POST /api/verify - トークン消費とデータ取得
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // LP APIからトークンを検証
    const lpApiUrl = process.env.LP_API_URL || 'http://localhost:3001';
    
    const verifyResponse = await fetch(`${lpApiUrl}/api/registration-token?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      return NextResponse.json(errorData, { status: verifyResponse.status });
    }

    const tokenData = await verifyResponse.json();

    // トークンを消費済みとしてマーク
    const consumeResponse = await fetch(`${lpApiUrl}/api/registration-token/consume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!consumeResponse.ok) {
      console.warn('Failed to mark token as consumed:', await consumeResponse.text());
      // 消費マークに失敗してもデータは返す（一度だけの使用制限はLP側で処理）
    }

    console.log('🎫 Registration token consumed:', {
      token: token.substring(0, 12) + '...',
      payload: tokenData.payload
    });

    // フロントエンドで使用しやすい形式でデータを返却
    return NextResponse.json({
      success: true,
      data: {
        primary_category: tokenData.payload.pc,
        secondary_categories: tokenData.payload.sc || [],
        model_training_consent: tokenData.payload.consent || false,
        source: tokenData.payload.source,
        timestamp: tokenData.payload.timestamp
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}

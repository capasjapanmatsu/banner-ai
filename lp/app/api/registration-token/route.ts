import { NextRequest, NextResponse } from 'next/server';
import { tokenStorage } from '../../../lib/tokenStorage';

// POST /api/registration-token - トークン生成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primary_category, secondary_categories, model_training_consent } = body;

    // バリデーション
    if (!primary_category) {
      return NextResponse.json(
        { error: 'primary_category is required' },
        { status: 400 }
      );
    }

    // カテゴリの妥当性チェック
    const validCategories = [
      'fashion', 'car_parts', 'home_electronics', 'interior',
      'food_beverage', 'beauty_health', 'sports_outdoor', 'hobby_entertainment'
    ];

    if (!validCategories.includes(primary_category)) {
      return NextResponse.json(
        { error: 'Invalid primary_category' },
        { status: 400 }
      );
    }

    // トークンとペイロードを生成
    const payload = {
      pc: primary_category,
      sc: secondary_categories || [],
      consent: model_training_consent || false,
      source: 'LP' as const,
      timestamp: new Date().toISOString()
    };

    const token = tokenStorage.createToken(payload);
    const tokenData = tokenStorage.getToken(token);
    
    if (!tokenData) {
      throw new Error('Failed to create token');
    }

    console.log('🎫 Registration token created:', {
      token,
      payload: tokenData.payload,
      expires_at: tokenData.expires_at
    });

    return NextResponse.json({
      token,
      expires_at: tokenData.expires_at,
      expires_in: process.env.TOKEN_TTL_MINUTES ? parseInt(process.env.TOKEN_TTL_MINUTES) * 60 : 900
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/registration-token?token=xxx - トークン検証（消費せず）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const tokenData = tokenStorage.getToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      );
    }

    // 有効期限チェック
    if (tokenStorage.isExpired(token)) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 410 }
      );
    }

    // 使用済みチェック
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'Token already used' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      payload: tokenData.payload,
      expires_at: tokenData.expires_at
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

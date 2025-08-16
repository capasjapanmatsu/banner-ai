import { NextRequest, NextResponse } from 'next/server';
import type { RegistrationToken } from '../route';

// TODO: 実際のデータベースまたはRedis実装に置き換える
// 現在は開発用のメモリストレージ（サーバー再起動で消失）
const tokenStorage = new Map<string, RegistrationToken>();

// POST /api/registration-token/verify - トークン検証・消費
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

    // TODO: データベースから取得
    const tokenData = tokenStorage.get(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      );
    }

    // 有効期限チェック
    if (new Date(tokenData.expires_at) < new Date()) {
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

    // トークンを消費状態にマーク
    tokenData.used_at = new Date().toISOString();
    
    // TODO: データベースに保存
    tokenStorage.set(token, tokenData);

    console.log('🎫 Registration token consumed:', {
      token,
      payload: tokenData.payload,
      used_at: tokenData.used_at
    });

    return NextResponse.json({
      success: true,
      payload: tokenData.payload
    });

  } catch (error) {
    console.error('Token verification/consumption error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

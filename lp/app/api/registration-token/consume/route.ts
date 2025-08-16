import { NextRequest, NextResponse } from 'next/server';
import { tokenStorage } from '../../../../lib/tokenStorage';

// POST /api/registration-token/consume - トークン消費
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

    // トークンを消費済みとしてマーク
    const success = tokenStorage.markAsUsed(token);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid, expired, or already used token' },
        { status: 400 }
      );
    }

    console.log('🎫 Registration token marked as used:', token.substring(0, 12) + '...');

    return NextResponse.json({
      success: true,
      consumed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token consumption error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

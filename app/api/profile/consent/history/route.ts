import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase/client';

// GET /api/profile/consent/history - 同意変更履歴の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 同意履歴を取得（最新順）
    const { data: history, error: historyError } = await supabase
      .from('consent_history')
      .select('id, prev_consent, next_consent, changed_at')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(Math.min(limit, 100)); // 最大100件まで

    if (historyError) {
      console.error('Consent history fetch error:', historyError);
      // 履歴が取得できない場合は空の配列を返す（エラーにしない）
      return NextResponse.json({
        success: true,
        history: [],
        message: 'History not available'
      });
    }

    return NextResponse.json({
      success: true,
      history: history || [],
      count: history?.length || 0
    });

  } catch (error) {
    console.error('Consent history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

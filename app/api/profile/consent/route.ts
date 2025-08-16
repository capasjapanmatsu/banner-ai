import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase/client';
import { analytics } from '../../../../src/analytics/track';

// PATCH /api/profile/consent - 学習同意設定の更新
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { next } = body;

    // バリデーション
    if (typeof next !== 'boolean') {
      return NextResponse.json(
        { error: 'next consent value must be boolean' },
        { status: 400 }
      );
    }

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 現在のプロフィール取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('model_training_consent')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    const prevConsent = profile?.model_training_consent || false;

    // 同じ値の場合はスキップ
    if (prevConsent === next) {
      return NextResponse.json({
        success: true,
        message: 'No change needed',
        current_consent: next
      });
    }

    // トランザクション開始: プロフィール更新 + 履歴追加
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ model_training_consent: next })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // 履歴に追加 (service_role権限が必要なため、エラーは警告程度に)
    const { error: historyError } = await supabase
      .from('consent_history')
      .insert({
        user_id: user.id,
        prev_consent: prevConsent,
        next_consent: next
      });

    if (historyError) {
      console.warn('Consent history insert warning:', historyError);
      // 履歴の追加に失敗してもプロフィール更新は成功とする
    }

    console.log('✅ Consent updated:', {
      user_id: user.id,
      prev_consent: prevConsent,
      next_consent: next,
      timestamp: new Date().toISOString()
    });

    // イベントトラッキング
    analytics.trackConsentToggled(user.id, prevConsent, next, new Date().toISOString());

    return NextResponse.json({
      success: true,
      current_consent: next,
      changed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Consent update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

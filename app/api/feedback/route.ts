import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const body = await req.json(); 
    // { accountId, audience, specBefore, specAfter, deltas, event='approve', userId? }
    const { 
      accountId, 
      audience, 
      specBefore, 
      specAfter, 
      deltas, 
      event = 'approve',
      userId 
    } = body;

    // 必須パラメータのバリデーション
    if (!accountId) {
      return NextResponse.json(
        { ok: false, error: 'accountId is required' }, 
        { status: 400 }
      );
    }

    // userIdがある場合はSupabaseに保存
    if (userId) {
      const { data, error } = await supabase
        .from('banner_events')
        .insert([{ 
          user_id: userId,
          audience, 
          event_type: event, 
          spec_before: specBefore, 
          spec_after: specAfter, 
          deltas 
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        // Supabaseエラーでもログを出力して継続
      } else {
        console.log('Feedback saved to Supabase:', data.id);
      }
    }

    // ここでは profile 更新はクライアント側で applyProfileUpdate 済み想定。
    // 将来はDB側に移してRPC化しても良い。
    return NextResponse.json({ 
      ok: true, 
      message: 'Feedback recorded successfully'
    });

  } catch (e: unknown) {
    const error = e as Error;
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}

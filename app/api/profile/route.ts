import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase/client';
import { analytics } from '../../../lib/analytics';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { primary_category, secondary_categories, model_training_consent } = body;

    // リクエストボディのバリデーション
    if (!primary_category) {
      return NextResponse.json(
        { error: 'primary_category is required' },
        { status: 400 }
      );
    }

    // 有効なカテゴリかチェック
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

    // secondary_categoriesの上限とコンテンツチェック
    if (secondary_categories && secondary_categories.length > 3) {
      return NextResponse.json(
        { error: 'secondary_categories cannot exceed 3 items' },
        { status: 400 }
      );
    }

    // secondary_categoriesの各要素が有効なカテゴリかチェック
    if (secondary_categories) {
      const invalidSecondaryCategories = secondary_categories.filter(
        (cat: string) => !validCategories.includes(cat)
      );
      
      if (invalidSecondaryCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid secondary_categories: ${invalidSecondaryCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 現在のユーザー取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // プロファイル更新
    const { data, error } = await supabase
      .from('profiles')
      .update({
        primary_category,
        secondary_categories: secondary_categories || [],
        model_training_consent: model_training_consent || false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // イベントトラッキング（カテゴリ変更）
    await analytics.trackCategorySelection(
      primary_category,
      secondary_categories,
      'app_signup'
    );

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 現在のユーザー取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // プロファイル取得
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

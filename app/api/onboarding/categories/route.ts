import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { Catalog } from '@banner-ai/catalog-taxonomy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      primary_category, 
      secondary_categories = [], 
      model_training_consent = false,
      shop_name 
    } = body;

    // バリデーション
    if (!primary_category) {
      return NextResponse.json(
        { error: 'primary_category is required' }, 
        { status: 400 }
      );
    }

    // primary_categoryが有効な値かチェック
    const validPrimaryCodes = Catalog.primary.map(cat => cat.code);
    if (!validPrimaryCodes.includes(primary_category)) {
      return NextResponse.json(
        { error: `Invalid primary_category. Must be one of: ${validPrimaryCodes.join(', ')}` },
        { status: 400 }
      );
    }

    // secondary_categoriesのバリデーション
    if (secondary_categories.length > Catalog.allowMultiSelect.max) {
      return NextResponse.json(
        { error: `Too many secondary categories. Maximum allowed: ${Catalog.allowMultiSelect.max}` },
        { status: 400 }
      );
    }

    // 重複チェック
    const uniqueSecondaryCategories = [...new Set(secondary_categories)];
    if (uniqueSecondaryCategories.length !== secondary_categories.length) {
      return NextResponse.json(
        { error: 'Duplicate categories found in secondary_categories' },
        { status: 400 }
      );
    }

    // 全てのsecondary_categoriesが有効かチェック
    for (const category of secondary_categories) {
      if (!validPrimaryCodes.includes(category)) {
        return NextResponse.json(
          { error: `Invalid secondary_category: ${category}` },
          { status: 400 }
        );
      }
    }

    // primary_categoryがsecondary_categoriesに含まれていないかチェック
    if (secondary_categories.includes(primary_category)) {
      return NextResponse.json(
        { error: 'primary_category cannot be included in secondary_categories' },
        { status: 400 }
      );
    }

    // 現在認証されているユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // プロファイルを保存（UPSERT）
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        shop_name,
        primary_category,
        secondary_categories,
        model_training_consent
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Profile save error:', error);
      return NextResponse.json(
        { error: 'Failed to save profile' }, 
        { status: 500 }
      );
    }

    console.log('Profile saved successfully:', data);

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Profile saved successfully'
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
    // 現在認証されているユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // 既存のプロファイルを取得
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return NextResponse.json({
          profile: null,
          message: 'Profile not found'
        });
      }
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: data,
      message: 'Profile fetched successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

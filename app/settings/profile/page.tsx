'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Catalog, getCategoryLabel, type CategoryItem, type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';
import { supabase } from '../../../lib/supabase/client';
import ConsentSettings from './ConsentSettings';

interface Profile {
  user_id: string;
  full_name?: string;
  email?: string;
  primary_category?: PrimaryCategoryCode;
  secondary_categories?: PrimaryCategoryCode[];
  model_training_consent?: boolean;
  created_at: string;
  updated_at?: string;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // フォーム状態
  const [primaryCategory, setPrimaryCategory] = useState<string>('');
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [trainingConsent, setTrainingConsent] = useState<boolean>(false);
  
  // UI状態
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 認証状態とプロファイル取得
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        // 認証状態確認
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }
        
        setUser(user);

        // プロファイル取得
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const { profile } = await response.json();
        setProfile(profile);
        
        // フォーム初期値設定
        setPrimaryCategory(profile.primary_category || '');
        setSecondaryCategories(profile.secondary_categories || []);
        setTrainingConsent(profile.model_training_consent || false);
        
      } catch (error) {
        console.error('Profile initialization error:', error);
        setErrorMessage('プロファイルの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, [router]);

  // セカンダリカテゴリの変更処理
  const handleSecondaryChange = (code: string, checked: boolean) => {
    if (checked) {
      if (secondaryCategories.length < Catalog.allowMultiSelect.max) {
        setSecondaryCategories(prev => [...prev, code]);
      }
    } else {
      setSecondaryCategories(prev => prev.filter(c => c !== code));
    }
  };

  // プロファイル保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!primaryCategory) {
      setErrorMessage('主な出品カテゴリを選択してください');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primary_category: primaryCategory,
          secondary_categories: secondaryCategories,
          model_training_consent: trainingConsent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const { profile: updatedProfile } = await response.json();
      setProfile(updatedProfile);
      
      // 成功メッセージ表示
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      // ローカルストレージのプロファイルも更新（メインページで使用）
      localStorage.setItem('profile:demo-account', JSON.stringify(updatedProfile));

    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">プロファイルを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">プロファイル設定</h1>
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              カテゴリ設定を変更すると、AIの推奨設定が更新されます
            </p>
          </div>
        </div>

        {/* 成功メッセージ */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  プロファイルが正常に更新されました
                </p>
              </div>
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* フォーム */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            {/* 基本情報 */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* カテゴリ設定 */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">カテゴリ設定</h2>
              
              {/* 主な出品カテゴリ */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  主な出品カテゴリ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Catalog.primary.map((category: CategoryItem) => (
                    <label key={category.code} className="flex items-center">
                      <input
                        type="radio"
                        name="primaryCategory"
                        value={category.code}
                        checked={primaryCategory === category.code}
                        onChange={(e) => setPrimaryCategory(e.target.value)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{category.label_ja}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 関連カテゴリ */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  関連カテゴリ <span className="text-gray-500">(任意・最大{Catalog.allowMultiSelect.max}つ)</span>
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Catalog.primary
                    .filter((category: CategoryItem) => category.code !== primaryCategory)
                    .map((category: CategoryItem) => (
                    <label key={category.code} className="flex items-center">
                      <input
                        type="checkbox"
                        value={category.code}
                        checked={secondaryCategories.includes(category.code)}
                        onChange={(e) => handleSecondaryChange(category.code, e.target.checked)}
                        disabled={!secondaryCategories.includes(category.code) && secondaryCategories.length >= Catalog.allowMultiSelect.max}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                      />
                      <span className={`text-sm ${!secondaryCategories.includes(category.code) && secondaryCategories.length >= Catalog.allowMultiSelect.max ? 'text-gray-400' : 'text-gray-700'}`}>
                        {category.label_ja}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  選択済み: {secondaryCategories.length}/{Catalog.allowMultiSelect.max}
                </p>
              </div>

              {/* 学習利用同意設定 */}
              <ConsentSettings
                currentConsent={trainingConsent}
                onConsentChange={setTrainingConsent}
                isUpdating={saving}
              />
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !primaryCategory}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </form>

        {/* 現在の設定表示 */}
        {profile && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">現在の設定</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">主なカテゴリ:</span>
                <span className="ml-2 text-gray-600">
                  {profile.primary_category ? getCategoryLabel(profile.primary_category) : '未設定'}
                </span>
              </div>
              {profile.secondary_categories && profile.secondary_categories.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">関連カテゴリ:</span>
                  <span className="ml-2 text-gray-600">
                    {profile.secondary_categories.map(code => getCategoryLabel(code)).join(', ')}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">学習利用同意:</span>
                <span className="ml-2 text-gray-600">
                  {profile.model_training_consent ? '同意済み' : '未同意'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">最終更新:</span>
                <span className="ml-2 text-gray-600">
                  {profile.updated_at ? new Date(profile.updated_at).toLocaleString('ja-JP') : '未更新'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

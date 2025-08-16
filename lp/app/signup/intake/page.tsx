'use client';

import { useState } from 'react';
import { Catalog, type CategoryItem } from '@banner-ai/catalog-taxonomy';
import { analytics } from '../../../../src/analytics/track';

export default function IntakePage() {
  const [primaryCategory, setPrimaryCategory] = useState<string>('');
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<string>('');
  const [learningConsent, setLearningConsent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSecondaryChange = (code: string, checked: boolean) => {
    if (checked) {
      if (secondaryCategories.length < Catalog.allowMultiSelect.max) {
        setSecondaryCategories(prev => [...prev, code]);
      }
    } else {
      setSecondaryCategories(prev => prev.filter(c => c !== code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!primaryCategory) {
      alert('主な出品カテゴリを選択してください');
      return;
    }

    setIsSubmitting(true);

    // デバッグ用ログ
    const formData = {
      primaryCategory,
      secondaryCategories,
      purpose,
      learningConsent
    };
    console.warn('LP事前アンケート送信データ:', formData);

    // イベントトラッキング
    analytics.trackCategorySelection(
      primaryCategory, 
      secondaryCategories, 
      learningConsent
    );

    try {
      // 環境変数でトークン方式かクエリパラメータ方式かを切り替え
      const useTokenHandoff = process.env.NEXT_PUBLIC_USE_TOKEN_HANDOFF === 'true';

      if (useTokenHandoff) {
        // トークン方式でのデータ送信
        const tokenResponse = await fetch('/api/registration-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            primary_category: primaryCategory,
            secondary_categories: secondaryCategories,
            model_training_consent: learningConsent,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token generation failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const appSignupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?token=${tokenData.token}`;
        
        console.warn('🎫 トークン方式でリダイレクト:', {
          token: tokenData.token.substring(0, 12) + '...',
          url: appSignupUrl
        });
        
        window.location.href = appSignupUrl;
      } else {
        // 従来のクエリパラメータ方式
        const params = new URLSearchParams();
        params.set('pc', primaryCategory);
        if (secondaryCategories.length > 0) {
          params.set('sc', secondaryCategories.join(','));
        }
        if (purpose) {
          params.set('purpose', purpose);
        }
        if (learningConsent) {
          params.set('consent', '1');
        }

        const appSignupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?${params.toString()}`;
        console.warn('📋 クエリパラメータ方式でリダイレクト:', appSignupUrl);
        
        window.location.href = appSignupUrl;
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('送信中にエラーが発生しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            事前アンケート
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            より良いサービス提供のため、簡単なアンケートにお答えください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* 主な出品カテゴリ（必須・単一選択） */}
            <div>
              <label 
                id="primary-category-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                主な出品カテゴリ <span className="text-red-500">*</span>
              </label>
              <div 
                className="space-y-2"
                role="radiogroup"
                aria-labelledby="primary-category-label"
              >
                {Catalog.primary.map((category: CategoryItem) => (
                  <label key={category.code} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="primaryCategory"
                      value={category.code}
                      checked={primaryCategory === category.code}
                      onChange={(e) => setPrimaryCategory(e.target.value)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 focus:ring-2"
                      aria-describedby={`primary-desc-${category.code}`}
                    />
                    <span className="text-sm text-gray-700" id={`primary-desc-${category.code}`}>
                      {category.label_ja}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 追加カテゴリ（任意・複数選択） */}
            <div>
              <label 
                id="secondary-categories-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                追加で関わるカテゴリ <span className="text-gray-500">(任意・最大{Catalog.allowMultiSelect.max}つ)</span>
              </label>
              <div 
                className="space-y-2"
                role="group"
                aria-labelledby="secondary-categories-label"
              >
                {Catalog.primary
                  .filter((category: CategoryItem) => category.code !== primaryCategory)
                  .map((category: CategoryItem) => (
                  <label key={category.code} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      value={category.code}
                      checked={secondaryCategories.includes(category.code)}
                      onChange={(e) => handleSecondaryChange(category.code, e.target.checked)}
                      disabled={!secondaryCategories.includes(category.code) && secondaryCategories.length >= Catalog.allowMultiSelect.max}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 focus:ring-2"
                      aria-describedby={`secondary-desc-${category.code}`}
                    />
                    <span className={`text-sm ${!secondaryCategories.includes(category.code) && secondaryCategories.length >= Catalog.allowMultiSelect.max ? 'text-gray-400' : 'text-gray-700'}`}
                          id={`secondary-desc-${category.code}`}>
                      {category.label_ja}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                選択済み: {secondaryCategories.length}/{Catalog.allowMultiSelect.max}
              </p>
            </div>

            {/* 利用目的（任意） */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                利用目的 <span className="text-gray-500">(任意)</span>
              </label>
              <select
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">選択してください</option>
                <option value="business">事業用</option>
                <option value="personal">個人用</option>
                <option value="research">研究・学習用</option>
                <option value="trial">試用・評価</option>
              </select>
            </div>

            {/* 学習利用への同意（任意） */}
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={learningConsent}
                  onChange={(e) => setLearningConsent(e.target.checked)}
                  className="mt-1 mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">学習利用への同意</span>
                  <span className="text-gray-500 block">
                    サービス改善のため、匿名化された利用データの学習利用に同意します（任意）
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !primaryCategory}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : 'アンケートを送信してサインアップに進む'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            このアンケートの結果は、より良いサービス提供のために使用されます
          </p>
        </div>
      </div>
    </div>
  );
}

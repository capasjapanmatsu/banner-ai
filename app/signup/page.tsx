'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCategoryLabel, type PrimaryCategoryCode } from '@banner-ai/catalog-taxonomy';
import { analytics } from '../../lib/analytics';
import { analytics as commonAnalytics } from '../../src/analytics/track';
import { createErrorHandler, type ErrorInfo } from '../../src/utils/errorHandler';
import ErrorDisplay from '../../components/ErrorDisplay';

interface IntakeData {
  primaryCategory?: string;
  secondaryCategories?: string[];
  purpose?: string;
  learningConsent?: boolean;
}

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [intakeData, setIntakeData] = useState<IntakeData>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = createErrorHandler(setError);

  const retryLoadIntakeData = () => {
    setError(null);
    window.location.reload();
  };

  const goBackToLP = () => {
    const lpUrl = process.env.NEXT_PUBLIC_LP_URL || 'http://localhost:3001';
    window.location.href = `${lpUrl}/signup/intake`;
  };

  useEffect(() => {
    const loadIntakeData = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        // トークンベースのデータ取得
        try {
          console.warn('🎫 トークンから事前アンケートデータを取得中:', token.substring(0, 12) + '...');
          
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            await handleError(new Error(`Token verification failed: ${response.status}`), response);
            return;
          }

          const result = await response.json();
          
          if (result.success && result.data) {
            const data = {
              primaryCategory: result.data.primary_category,
              secondaryCategories: result.data.secondary_categories,
              purpose: undefined, // トークンには含まれない
              learningConsent: result.data.model_training_consent,
            };
            
            setIntakeData(data);
            console.warn('🎫 トークンから取得した事前アンケートデータ:', data);
          } else {
            await handleError(new Error('Invalid token response'));
          }
        } catch (error) {
          console.error('Token verification error:', error);
          await handleError(error);
        }
      } else {
        // 従来のクエリパラメータからの取得
        const pc = searchParams.get('pc');
        const sc = searchParams.get('sc');
        const purpose = searchParams.get('purpose');
        const consent = searchParams.get('consent');

        // カテゴリの妥当性チェック
        const validCategories = [
          'fashion', 'car_parts', 'home_electronics', 'interior',
          'food_beverage', 'beauty_health', 'sports_outdoor', 'hobby_entertainment'
        ];

        let validatedPc: string | null = pc;
        if (pc && !validCategories.includes(pc)) {
          console.warn('Invalid category detected:', pc);
          await handleError(new Error(`Invalid category: ${pc}`));
          validatedPc = null; // 不正カテゴリは無効化
        }

        const data = {
          primaryCategory: validatedPc || undefined,
          secondaryCategories: sc ? sc.split(',').filter(cat => validCategories.includes(cat)) : undefined,
          purpose: purpose || undefined,
          learningConsent: consent === '1',
        };

        setIntakeData(data);
        console.warn('📋 クエリパラメータから取得した事前アンケートデータ:', data);
      }
    };

    loadIntakeData();
  }, [searchParams, handleError]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      alert('利用規約に同意してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // ここに実際のサインアップAPI呼び出しを追加
      const signupData = {
        email,
        password,
        shopName,
        profile: {
          primary_category: intakeData.primaryCategory,
          secondary_categories: intakeData.secondaryCategories || [],
          model_training_consent: intakeData.learningConsent || false,
        }
      };

      console.warn('サインアップ処理を実行:', signupData);
      
      // カテゴリ選択イベントをトラッキング
      if (intakeData.primaryCategory) {
        await analytics.trackCategorySelection(
          intakeData.primaryCategory,
          intakeData.secondaryCategories,
          'app_signup'
        );
        
        // 共通イベントトラッキング
        commonAnalytics.trackCategorySelection(
          intakeData.primaryCategory,
          intakeData.secondaryCategories,
          intakeData.learningConsent
        );
      }

      // サインアップ完了イベント（実際のユーザーID取得後に呼び出し）
      // commonAnalytics.trackSignupCompleted(
      //   'user-id-placeholder',
      //   intakeData.primaryCategory!,
      //   intakeData.secondaryCategories,
      //   intakeData.learningConsent,
      //   email,
      //   shopName
      // );

      // API呼び出し（実装予定）
      // const response = await fetch('/api/auth/signup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(signupData)
      // });

      alert('サインアップが完了しました（デモ）');
      
      // 成功時はダッシュボードにリダイレクト
      // window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('サインアップエラー:', error);
      alert('サインアップに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            アカウント作成
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ShopDesigner AIへようこそ
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-6">
            <ErrorDisplay
              errorInfo={error}
              onRetry={retryLoadIntakeData}
              onGoBack={goBackToLP}
            />
          </div>
        )}

        {/* 事前アンケート結果の表示 */}
        {intakeData.primaryCategory && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              事前アンケート結果
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-800">主なカテゴリ:</span>
                <span className="ml-2 text-blue-700">
                  {getCategoryLabel(intakeData.primaryCategory as PrimaryCategoryCode)}
                </span>
              </div>
              
              {intakeData.secondaryCategories && intakeData.secondaryCategories.length > 0 && (
                <div>
                  <span className="font-medium text-blue-800">追加カテゴリ:</span>
                  <span className="ml-2 text-blue-700">
                    {intakeData.secondaryCategories.map(code => getCategoryLabel(code as PrimaryCategoryCode)).join(', ')}
                  </span>
                </div>
              )}
              
              {intakeData.purpose && (
                <div>
                  <span className="font-medium text-blue-800">利用目的:</span>
                  <span className="ml-2 text-blue-700">{intakeData.purpose}</span>
                </div>
              )}
              
              {intakeData.learningConsent && (
                <div>
                  <span className="font-medium text-blue-800">学習利用:</span>
                  <span className="ml-2 text-blue-700">同意済み</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your-email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="8文字以上のパスワード"
              />
            </div>

            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                ショップ名
              </label>
              <input
                id="shopName"
                name="shopName"
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="あなたのショップ名"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              <a href="/terms" className="text-blue-600 hover:text-blue-500">利用規約</a>
              および
              <a href="/privacy" className="text-blue-600 hover:text-blue-500">プライバシーポリシー</a>
              に同意します
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !termsAccepted}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'アカウント作成中...' : 'アカウントを作成'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちですか？
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 ml-1">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

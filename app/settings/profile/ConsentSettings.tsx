'use client';

import { useState, useEffect } from 'react';

interface ConsentSettingsProps {
  currentConsent: boolean;
  onConsentChange: (newConsent: boolean) => void;
  isUpdating: boolean;
}

export default function ConsentSettings({ 
  currentConsent, 
  onConsentChange, 
  isUpdating 
}: ConsentSettingsProps) {
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 最新の変更履歴を取得
  useEffect(() => {
    const fetchLastChange = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch('/api/profile/consent/history?limit=1');
        if (response.ok) {
          const { history } = await response.json();
          if (history && history.length > 0) {
            setLastChanged(history[0].changed_at);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch consent history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchLastChange();
  }, [currentConsent]); // currentConsentが変わったら履歴を再取得

  const handleToggle = async () => {
    const newConsent = !currentConsent;
    
    // 楽観的UI: 即座に状態を更新
    onConsentChange(newConsent);
    const originalLastChanged = lastChanged;
    setLastChanged(new Date().toISOString());
    
    try {
      const response = await fetch('/api/profile/consent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ next: newConsent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update consent');
      }

      const result = await response.json();
      
      if (result.success) {
        // サーバーの応答で最終的な変更日時を更新
        setLastChanged(result.changed_at);
        console.log('✅ Consent updated successfully:', {
          previous: !newConsent,
          current: newConsent,
          changed_at: result.changed_at
        });
      } else {
        throw new Error('Server returned unsuccessful response');
      }
    } catch (error) {
      console.error('Consent update error:', error);
      // 失敗時は元の状態に戻す
      onConsentChange(!newConsent);
      setLastChanged(originalLastChanged);
      // エラーハンドリングは親コンポーネントで処理
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '不明';
    }
  };

  return (
    <div className="space-y-4">
      {/* 学習利用設定セクション */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              学習への利用
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              生成品質向上のため、画像・指示・フィードバックを匿名化して学習に利用します。設定はいつでも変更できます。
            </p>
            
            {/* 最新変更日の表示 */}
            {lastChanged && !loadingHistory && (
              <p className="text-xs text-gray-500 mb-4">
                最終更新: {formatDate(lastChanged)}
              </p>
            )}
            
            {loadingHistory && (
              <p className="text-xs text-gray-400 mb-4">
                履歴を読み込み中...
              </p>
            )}
          </div>
          
          {/* トグルスイッチ */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentConsent}
                onChange={handleToggle}
                disabled={isUpdating}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                currentConsent ? 'bg-blue-600' : 'bg-gray-300'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    currentConsent ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-900">
                {currentConsent ? '利用する' : '利用しない'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

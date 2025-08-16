'use client';

import { type ErrorInfo } from '../src/utils/errorHandler';

interface ErrorDisplayProps {
  errorInfo: ErrorInfo;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export default function ErrorDisplay({ 
  errorInfo, 
  onRetry, 
  onGoBack, 
  className = '' 
}: ErrorDisplayProps) {
  const getLpUrl = () => {
    if (typeof window !== 'undefined') {
      const lpUrl = process.env.NEXT_PUBLIC_LP_URL || 'http://localhost:3001';
      return `${lpUrl}/signup/intake`;
    }
    return '#';
  };

  const handleAction = () => {
    if (errorInfo.action === 'LPに戻る' && onGoBack) {
      onGoBack();
    } else if (errorInfo.action === '再試行' && onRetry) {
      onRetry();
    } else if (errorInfo.action === 'LPに戻る') {
      window.location.href = getLpUrl();
    }
  };

  return (
    <div className={`rounded-lg border-l-4 border-red-400 bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {errorInfo.title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{errorInfo.message}</p>
          </div>
          <div className="mt-4">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleAction}
                className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                {errorInfo.action}
              </button>
              {onRetry && errorInfo.action !== '再試行' && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 border border-red-200"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

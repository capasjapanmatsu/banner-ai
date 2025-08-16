import errorMessages from '../i18n/errors.json';

export interface ErrorInfo {
  title: string;
  message: string;
  action: string;
}

export function getErrorInfo(errorCode: string): ErrorInfo {
  // エラーコードに対応するメッセージを取得
  const errorData = errorMessages[errorCode as keyof typeof errorMessages];
  
  if (errorData) {
    return errorData;
  }
  
  // デフォルトエラー
  return errorMessages.unknown_error;
}

export function getErrorCodeFromResponse(response: Response, responseData?: Record<string, unknown>): string {
  // HTTPステータスコードからエラーコードを推測
  switch (response.status) {
    case 400:
      if (typeof responseData?.error === 'string' && responseData.error.includes('category')) {
        return 'invalid_category';
      }
      return 'unknown_error';
    case 401:
      return 'token_expired';
    case 404:
      return 'invalid_token';
    case 410:
      if (typeof responseData?.error === 'string' && responseData.error.includes('expired')) {
        return 'token_expired';
      }
      if (typeof responseData?.error === 'string' && responseData.error.includes('used')) {
        return 'token_already_used';
      }
      return 'invalid_token';
    case 500:
      return 'unknown_error';
    default:
      return 'network_error';
  }
}

export function createErrorHandler(onError: (errorInfo: ErrorInfo) => void) {
  return async (error: Error | unknown, response?: Response) => {
    let errorCode = 'unknown_error';
    
    if (response) {
      try {
        const responseData = await response.json();
        errorCode = getErrorCodeFromResponse(response, responseData);
      } catch {
        errorCode = getErrorCodeFromResponse(response);
      }
    } else if (error instanceof Error && error.message.includes('fetch')) {
      errorCode = 'network_error';
    }
    
    const errorInfo = getErrorInfo(errorCode);
    onError(errorInfo);
  };
}

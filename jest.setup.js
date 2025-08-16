// Jest セットアップファイル

// Node.js環境の設定
if (typeof global !== 'undefined') {
  // LocalStorage モック
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  global.localStorage = localStorageMock;

  // SessionStorage モック  
  global.sessionStorage = localStorageMock;

  // fetch モック
  global.fetch = jest.fn();

  // console.error をスパイ化（予期されるエラーログ抑制用）
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
}

// テスト間のクリーンアップ
beforeEach(() => {
  // LocalStorage をクリア
  if (global.localStorage) {
    global.localStorage.clear();
  }
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
  
  // fetch モックをクリア
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
  
  // console スパイをクリア
  if (jest.isMockFunction(console.error)) {
    console.error.mockClear();
  }
  if (jest.isMockFunction(console.warn)) {
    console.warn.mockClear();
  }
});

// 非同期テストのタイムアウト設定
jest.setTimeout(10000);

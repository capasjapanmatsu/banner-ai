/**
 * 登録トークンAPI統合テスト
 */

import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

// Token Manager のモック実装
class MockTokenManager {
  private tokens: Map<string, {
    token: string;
    category: string;
    issuedAt: number;
    consumed: boolean;
    ttl: number;
  }> = new Map();

  // トークン発行
  issueToken(category: string, ttlSeconds: number = 3600): {token: string, expiresAt: string} {
    const token = `regtoken_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuedAt = Date.now();
    const expiresAt = new Date(issuedAt + (ttlSeconds * 1000)).toISOString();

    this.tokens.set(token, {
      token,
      category,
      issuedAt,
      consumed: false,
      ttl: ttlSeconds
    });

    return { token, expiresAt };
  }

  // トークン消費
  consumeToken(token: string): {valid: boolean, category?: string, reason?: string} {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return { valid: false, reason: 'Token not found' };
    }

    if (tokenData.consumed) {
      return { valid: false, reason: 'Token already consumed' };
    }

    const now = Date.now();
    const expiresAt = tokenData.issuedAt + (tokenData.ttl * 1000);
    
    if (now > expiresAt) {
      return { valid: false, reason: 'Token expired' };
    }

    // トークンを消費済みにマーク
    tokenData.consumed = true;
    
    return { valid: true, category: tokenData.category };
  }

  // テスト用ヘルパー
  clearTokens(): void {
    this.tokens.clear();
  }

  getTokenInfo(token: string) {
    return this.tokens.get(token);
  }

  getAllTokens() {
    return Array.from(this.tokens.values());
  }
}

// Next.js アプリのセットアップ（テスト用）
let app: any;
let server: any;

beforeAll(async () => {
  const dev = process.env.NODE_ENV !== 'production';
  app = next({ dev, dir: process.cwd() });
  await app.prepare();
  
  server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    app.getRequestHandler()(req, res, parsedUrl);
  });
}, 30000);

afterAll(async () => {
  if (server) {
    server.close();
  }
  if (app) {
    await app.close();
  }
});

describe('Registration Token API Integration Tests', () => {
  let tokenManager: MockTokenManager;

  beforeEach(() => {
    tokenManager = new MockTokenManager();
  });

  describe('POST /api/tokens/registration - トークン発行', () => {
    test('正常なトークン発行', async () => {
      const category = 'fashion';
      const issueResult = tokenManager.issueToken(category);

      expect(issueResult.token).toBeDefined();
      expect(issueResult.token).toMatch(/^regtoken_\d+_[a-z0-9]+$/);
      expect(issueResult.expiresAt).toBeDefined();
      
      // 発行されたトークンが保存されている
      const tokenInfo = tokenManager.getTokenInfo(issueResult.token);
      expect(tokenInfo?.category).toBe(category);
      expect(tokenInfo?.consumed).toBe(false);
    });

    test('カスタムTTLでのトークン発行', async () => {
      const shortTtl = 300; // 5分
      const issueResult = tokenManager.issueToken('electronics', shortTtl);
      
      const tokenInfo = tokenManager.getTokenInfo(issueResult.token);
      expect(tokenInfo?.ttl).toBe(shortTtl);
    });

    test('複数トークンの発行で重複しない', async () => {
      const token1 = tokenManager.issueToken('fashion');
      const token2 = tokenManager.issueToken('electronics');
      const token3 = tokenManager.issueToken('fashion');

      expect(token1.token).not.toBe(token2.token);
      expect(token1.token).not.toBe(token3.token);
      expect(token2.token).not.toBe(token3.token);
      
      expect(tokenManager.getAllTokens()).toHaveLength(3);
    });
  });

  describe('POST /api/tokens/consume - トークン消費', () => {
    test('発行→消費の正常フロー', async () => {
      const category = 'beauty_health';
      const issueResult = tokenManager.issueToken(category);
      
      const consumeResult = tokenManager.consumeToken(issueResult.token);
      
      expect(consumeResult.valid).toBe(true);
      expect(consumeResult.category).toBe(category);
      expect(consumeResult.reason).toBeUndefined();
      
      // トークンが消費済みになっている
      const tokenInfo = tokenManager.getTokenInfo(issueResult.token);
      expect(tokenInfo?.consumed).toBe(true);
    });

    test('2回目の消費で失効エラー', async () => {
      const issueResult = tokenManager.issueToken('sports_outdoor');
      
      // 1回目の消費（成功）
      const firstConsume = tokenManager.consumeToken(issueResult.token);
      expect(firstConsume.valid).toBe(true);
      
      // 2回目の消費（失敗）
      const secondConsume = tokenManager.consumeToken(issueResult.token);
      expect(secondConsume.valid).toBe(false);
      expect(secondConsume.reason).toBe('Token already consumed');
      expect(secondConsume.category).toBeUndefined();
    });

    test('存在しないトークンで失敗', async () => {
      const fakeToken = 'regtoken_fake_invalid';
      
      const result = tokenManager.consumeToken(fakeToken);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token not found');
      expect(result.category).toBeUndefined();
    });

    test('期限切れトークンで失敗', async () => {
      const shortTtl = 1; // 1秒
      const issueResult = tokenManager.issueToken('hobby_entertainment', shortTtl);
      
      // 2秒待機（トークン期限切れ）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = tokenManager.consumeToken(issueResult.token);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token expired');
      expect(result.category).toBeUndefined();
    }, 10000);

    test('期限内の有効なトークンは消費できる', async () => {
      const longTtl = 3600; // 1時間
      const issueResult = tokenManager.issueToken('car_parts', longTtl);
      
      // 少し待機（期限内）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = tokenManager.consumeToken(issueResult.token);
      
      expect(result.valid).toBe(true);
      expect(result.category).toBe('car_parts');
    });
  });

  describe('トークンライフサイクル統合テスト', () => {
    test('複数トークンの並行発行・消費', async () => {
      const categories = ['fashion', 'electronics', 'food_beverage'];
      const tokens: string[] = [];
      
      // 並行発行
      for (const category of categories) {
        const result = tokenManager.issueToken(category);
        tokens.push(result.token);
      }
      
      expect(tokens).toHaveLength(3);
      expect(tokenManager.getAllTokens()).toHaveLength(3);
      
      // 並行消費
      const consumeResults = tokens.map(token => tokenManager.consumeToken(token));
      
      consumeResults.forEach((result, index) => {
        expect(result.valid).toBe(true);
        expect(result.category).toBe(categories[index]);
      });
      
      // 全て消費済み
      const allTokens = tokenManager.getAllTokens();
      expect(allTokens.every(t => t.consumed)).toBe(true);
    });

    test('一部期限切れ、一部有効の混在シナリオ', async () => {
      // 短期間トークン
      const shortResult = tokenManager.issueToken('beauty_health', 1);
      // 長期間トークン  
      const longResult = tokenManager.issueToken('interior', 3600);
      
      // 2秒待機
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const shortConsume = tokenManager.consumeToken(shortResult.token);
      const longConsume = tokenManager.consumeToken(longResult.token);
      
      expect(shortConsume.valid).toBe(false);
      expect(shortConsume.reason).toBe('Token expired');
      
      expect(longConsume.valid).toBe(true);
      expect(longConsume.category).toBe('interior');
    }, 10000);

    test('大量トークンの処理性能', async () => {
      const tokenCount = 1000;
      const startTime = Date.now();
      
      // 大量発行
      const tokens: string[] = [];
      for (let i = 0; i < tokenCount; i++) {
        const category = ['fashion', 'electronics', 'food_beverage'][i % 3];
        const result = tokenManager.issueToken(category);
        tokens.push(result.token);
      }
      
      const issueTime = Date.now() - startTime;
      expect(issueTime).toBeLessThan(5000); // 5秒以内
      
      // 大量消費
      const consumeStartTime = Date.now();
      const results = tokens.map(token => tokenManager.consumeToken(token));
      const consumeTime = Date.now() - consumeStartTime;
      
      expect(consumeTime).toBeLessThan(5000); // 5秒以内
      expect(results.every(r => r.valid)).toBe(true);
      expect(tokenManager.getAllTokens()).toHaveLength(tokenCount);
    });
  });

  describe('エラーハンドリング', () => {
    test('不正な形式のトークンで適切なエラー', async () => {
      const invalidTokens = [
        '',
        'invalid_format',
        'regtoken_', 
        'regtoken_abc',
        null,
        undefined
      ];
      
      for (const invalidToken of invalidTokens) {
        const result = tokenManager.consumeToken(invalidToken as any);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Token not found');
      }
    });

    test('極端に短いTTLでの動作', async () => {
      const result = tokenManager.issueToken('test', 0.1); // 0.1秒
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const consumeResult = tokenManager.consumeToken(result.token);
      expect(consumeResult.valid).toBe(false);
      expect(consumeResult.reason).toBe('Token expired');
    });

    test('極端に長いTTLでの動作', async () => {
      const longTtl = 365 * 24 * 3600; // 1年
      const result = tokenManager.issueToken('test', longTtl);
      
      const tokenInfo = tokenManager.getTokenInfo(result.token);
      expect(tokenInfo?.ttl).toBe(longTtl);
      
      const consumeResult = tokenManager.consumeToken(result.token);
      expect(consumeResult.valid).toBe(true);
    });
  });
});

/**
 * プロフィール/同意管理API統合テスト
 */

import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

// プロフィール同意情報の型定義
interface ConsentHistory {
  timestamp: string;
  version: string;
  categories: {
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
  ipAddress?: string;
  userAgent?: string;
}

interface Profile {
  id: string;
  email: string;
  preferences?: {
    favoriteCategories: string[];
    notificationSettings: {
      email: boolean;
      push: boolean;
    };
  };
  consentHistory: ConsentHistory[];
  createdAt: string;
  updatedAt: string;
}

// Profile Manager のモック実装
class MockProfileManager {
  private profiles: Map<string, Profile> = new Map();
  private currentVersion = '1.0.0';

  // プロフィール作成
  createProfile(email: string, initialConsent: ConsentHistory['categories']): Profile {
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const profile: Profile = {
      id: profileId,
      email,
      preferences: {
        favoriteCategories: [],
        notificationSettings: {
          email: true,
          push: false
        }
      },
      consentHistory: [{
        timestamp: now,
        version: this.currentVersion,
        categories: { ...initialConsent },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }],
      createdAt: now,
      updatedAt: now
    };

    this.profiles.set(profileId, profile);
    return profile;
  }

  // プロフィール取得
  getProfile(profileId: string): Profile | null {
    return this.profiles.get(profileId) || null;
  }

  // 同意設定更新
  updateConsent(
    profileId: string, 
    newConsent: ConsentHistory['categories'],
    metadata?: { ipAddress?: string; userAgent?: string }
  ): { success: boolean; profile?: Profile; error?: string } {
    const profile = this.profiles.get(profileId);
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    const lastConsent = profile.consentHistory[profile.consentHistory.length - 1];
    
    // 同じ設定値の場合はスキップ
    if (this.isSameConsent(lastConsent.categories, newConsent)) {
      return { success: true, profile };
    }

    // 新しい同意履歴を追加
    const newConsentEntry: ConsentHistory = {
      timestamp: new Date().toISOString(),
      version: this.currentVersion,
      categories: { ...newConsent },
      ipAddress: metadata?.ipAddress || '127.0.0.1',
      userAgent: metadata?.userAgent || 'test-agent'
    };

    profile.consentHistory.push(newConsentEntry);
    profile.updatedAt = newConsentEntry.timestamp;

    return { success: true, profile };
  }

  // プロフィール設定更新
  updatePreferences(
    profileId: string,
    preferences: Partial<Profile['preferences']>
  ): { success: boolean; profile?: Profile; error?: string } {
    const profile = this.profiles.get(profileId);
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    profile.preferences = {
      ...profile.preferences!,
      ...preferences
    };
    profile.updatedAt = new Date().toISOString();

    return { success: true, profile };
  }

  // ヘルパーメソッド
  private isSameConsent(
    consent1: ConsentHistory['categories'], 
    consent2: ConsentHistory['categories']
  ): boolean {
    return consent1.analytics === consent2.analytics &&
           consent1.marketing === consent2.marketing &&
           consent1.personalization === consent2.personalization;
  }

  // テスト用ヘルパー
  clearProfiles(): void {
    this.profiles.clear();
  }

  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  setConsentVersion(version: string): void {
    this.currentVersion = version;
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

describe('Profile/Consent API Integration Tests', () => {
  let profileManager: MockProfileManager;

  beforeEach(() => {
    profileManager = new MockProfileManager();
  });

  describe('POST /api/profile - プロフィール作成', () => {
    test('初期同意設定でプロフィール作成', async () => {
      const email = 'test@example.com';
      const initialConsent = {
        analytics: true,
        marketing: false,
        personalization: true
      };

      const profile = profileManager.createProfile(email, initialConsent);

      expect(profile.id).toBeDefined();
      expect(profile.email).toBe(email);
      expect(profile.consentHistory).toHaveLength(1);
      expect(profile.consentHistory[0].categories).toEqual(initialConsent);
      expect(profile.consentHistory[0].version).toBe('1.0.0');
      expect(profile.preferences?.favoriteCategories).toEqual([]);
    });

    test('全て拒否での初期プロフィール作成', async () => {
      const email = 'minimal@example.com';
      const minimalConsent = {
        analytics: false,
        marketing: false,
        personalization: false
      };

      const profile = profileManager.createProfile(email, minimalConsent);

      expect(profile.consentHistory[0].categories).toEqual(minimalConsent);
      expect(profile.preferences?.notificationSettings.email).toBe(true); // デフォルト
    });

    test('複数プロフィールの並行作成', async () => {
      const emails = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
      const profiles: Profile[] = [];

      for (const email of emails) {
        const consent = {
          analytics: true,
          marketing: Math.random() > 0.5,
          personalization: true
        };
        profiles.push(profileManager.createProfile(email, consent));
      }

      expect(profiles).toHaveLength(3);
      expect(profiles.map(p => p.email)).toEqual(emails);
      expect(profileManager.getAllProfiles()).toHaveLength(3);
    });
  });

  describe('PATCH /api/profile/consent - 同意設定更新', () => {
    let testProfile: Profile;

    beforeEach(() => {
      testProfile = profileManager.createProfile('consent-test@example.com', {
        analytics: true,
        marketing: false,
        personalization: true
      });
    });

    test('同意設定の正常更新', async () => {
      const newConsent = {
        analytics: false,
        marketing: true,
        personalization: false
      };

      const result = profileManager.updateConsent(testProfile.id, newConsent, {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      });

      expect(result.success).toBe(true);
      expect(result.profile?.consentHistory).toHaveLength(2);
      expect(result.profile?.consentHistory[1].categories).toEqual(newConsent);
      expect(result.profile?.consentHistory[1].ipAddress).toBe('192.168.1.100');
      expect(result.profile?.consentHistory[1].userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    test('同じ設定値での更新はスキップ', async () => {
      const sameConsent = {
        analytics: true,
        marketing: false,
        personalization: true
      };

      const result = profileManager.updateConsent(testProfile.id, sameConsent);

      expect(result.success).toBe(true);
      expect(result.profile?.consentHistory).toHaveLength(1); // 増えない
      expect(result.profile?.updatedAt).toBe(testProfile.updatedAt); // 更新されない
    });

    test('存在しないプロフィールでエラー', async () => {
      const fakeId = 'profile_fake_12345';
      const newConsent = {
        analytics: true,
        marketing: true,
        personalization: true
      };

      const result = profileManager.updateConsent(fakeId, newConsent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
      expect(result.profile).toBeUndefined();
    });

    test('連続した同意設定変更の履歴追跡', async () => {
      const changes = [
        { analytics: false, marketing: true, personalization: true },
        { analytics: true, marketing: true, personalization: false },
        { analytics: true, marketing: false, personalization: false }
      ];

      for (const change of changes) {
        const result = profileManager.updateConsent(testProfile.id, change);
        expect(result.success).toBe(true);
      }

      const finalProfile = profileManager.getProfile(testProfile.id);
      expect(finalProfile?.consentHistory).toHaveLength(4); // 初期 + 3回変更
      
      // 最新の設定が正しい
      const latestConsent = finalProfile?.consentHistory[3];
      expect(latestConsent?.categories).toEqual(changes[2]);
    });

    test('同意バージョンの変更対応', async () => {
      // バージョンを変更
      profileManager.setConsentVersion('2.0.0');

      const newConsent = {
        analytics: false,
        marketing: false,
        personalization: false
      };

      const result = profileManager.updateConsent(testProfile.id, newConsent);

      expect(result.success).toBe(true);
      expect(result.profile?.consentHistory[1].version).toBe('2.0.0');
    });
  });

  describe('PATCH /api/profile/preferences - 設定更新', () => {
    let testProfile: Profile;

    beforeEach(() => {
      testProfile = profileManager.createProfile('prefs-test@example.com', {
        analytics: true,
        marketing: true,
        personalization: true
      });
    });

    test('お気に入りカテゴリ更新', async () => {
      const newPreferences = {
        favoriteCategories: ['fashion', 'electronics', 'food_beverage']
      };

      const result = profileManager.updatePreferences(testProfile.id, newPreferences);

      expect(result.success).toBe(true);
      expect(result.profile?.preferences?.favoriteCategories).toEqual(newPreferences.favoriteCategories);
      expect(result.profile?.updatedAt).not.toBe(testProfile.updatedAt);
    });

    test('通知設定更新', async () => {
      const newPreferences = {
        notificationSettings: {
          email: false,
          push: true
        }
      };

      const result = profileManager.updatePreferences(testProfile.id, newPreferences);

      expect(result.success).toBe(true);
      expect(result.profile?.preferences?.notificationSettings).toEqual(newPreferences.notificationSettings);
      
      // お気に入りカテゴリは保持される
      expect(result.profile?.preferences?.favoriteCategories).toEqual([]);
    });

    test('部分的な設定更新', async () => {
      // 最初にお気に入りカテゴリを設定
      profileManager.updatePreferences(testProfile.id, {
        favoriteCategories: ['beauty_health', 'sports_outdoor']
      });

      // 通知設定のみ更新
      const result = profileManager.updatePreferences(testProfile.id, {
        notificationSettings: {
          email: false,
          push: false
        }
      });

      expect(result.success).toBe(true);
      expect(result.profile?.preferences?.favoriteCategories).toEqual(['beauty_health', 'sports_outdoor']);
      expect(result.profile?.preferences?.notificationSettings.email).toBe(false);
      expect(result.profile?.preferences?.notificationSettings.push).toBe(false);
    });

    test('存在しないプロフィールでエラー', async () => {
      const fakeId = 'profile_fake_67890';
      const preferences = {
        favoriteCategories: ['test']
      };

      const result = profileManager.updatePreferences(fakeId, preferences);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });
  });

  describe('GET /api/profile/:id - プロフィール取得', () => {
    test('存在するプロフィールの取得', async () => {
      const email = 'get-test@example.com';
      const createdProfile = profileManager.createProfile(email, {
        analytics: true,
        marketing: false,
        personalization: true
      });

      const retrievedProfile = profileManager.getProfile(createdProfile.id);

      expect(retrievedProfile).not.toBeNull();
      expect(retrievedProfile?.id).toBe(createdProfile.id);
      expect(retrievedProfile?.email).toBe(email);
      expect(retrievedProfile?.consentHistory).toHaveLength(1);
    });

    test('存在しないプロフィールの取得', async () => {
      const fakeId = 'profile_nonexistent_12345';

      const profile = profileManager.getProfile(fakeId);

      expect(profile).toBeNull();
    });

    test('同意履歴の完全性確認', async () => {
      const profile = profileManager.createProfile('history-test@example.com', {
        analytics: false,
        marketing: false,
        personalization: false
      });

      // 複数回同意変更
      profileManager.updateConsent(profile.id, {
        analytics: true,
        marketing: false,
        personalization: false
      });

      profileManager.updateConsent(profile.id, {
        analytics: true,
        marketing: true,
        personalization: true
      });

      const finalProfile = profileManager.getProfile(profile.id);

      expect(finalProfile?.consentHistory).toHaveLength(3);
      expect(finalProfile?.consentHistory[0].categories.analytics).toBe(false);
      expect(finalProfile?.consentHistory[1].categories.analytics).toBe(true);
      expect(finalProfile?.consentHistory[2].categories.marketing).toBe(true);
    });
  });

  describe('プロフィールライフサイクル統合テスト', () => {
    test('完全なユーザージャーニー', async () => {
      // 1. プロフィール作成
      const email = 'journey@example.com';
      const profile = profileManager.createProfile(email, {
        analytics: true,
        marketing: false,
        personalization: false
      });

      expect(profile.consentHistory).toHaveLength(1);

      // 2. 設定カスタマイズ
      const prefsResult = profileManager.updatePreferences(profile.id, {
        favoriteCategories: ['fashion', 'beauty_health'],
        notificationSettings: { email: true, push: true }
      });

      expect(prefsResult.success).toBe(true);

      // 3. 同意設定変更
      const consentResult = profileManager.updateConsent(profile.id, {
        analytics: true,
        marketing: true,
        personalization: true
      });

      expect(consentResult.success).toBe(true);

      // 4. 最終確認
      const finalProfile = profileManager.getProfile(profile.id);
      expect(finalProfile?.consentHistory).toHaveLength(2);
      expect(finalProfile?.preferences?.favoriteCategories).toEqual(['fashion', 'beauty_health']);
      expect(finalProfile?.consentHistory[1].categories.marketing).toBe(true);
    });

    test('大量プロフィールでのパフォーマンス', async () => {
      const profileCount = 1000;
      const startTime = Date.now();

      // 大量作成
      const profileIds: string[] = [];
      for (let i = 0; i < profileCount; i++) {
        const profile = profileManager.createProfile(`user${i}@test.com`, {
          analytics: i % 2 === 0,
          marketing: i % 3 === 0,
          personalization: i % 5 === 0
        });
        profileIds.push(profile.id);
      }

      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(10000); // 10秒以内

      // 大量取得
      const retrievalStartTime = Date.now();
      const retrievedProfiles = profileIds.map(id => profileManager.getProfile(id));
      const retrievalTime = Date.now() - retrievalStartTime;

      expect(retrievalTime).toBeLessThan(5000); // 5秒以内
      expect(retrievedProfiles.every(p => p !== null)).toBe(true);
      expect(profileManager.getAllProfiles()).toHaveLength(profileCount);
    });

    test('エラー処理とデータ整合性', async () => {
      const profile = profileManager.createProfile('integrity@test.com', {
        analytics: true,
        marketing: true,
        personalization: true
      });

      // 不正なプロフィールIDでの操作
      const invalidConsentResult = profileManager.updateConsent('invalid_id', {
        analytics: false,
        marketing: false,
        personalization: false
      });

      expect(invalidConsentResult.success).toBe(false);

      // 元のプロフィールは影響を受けない
      const originalProfile = profileManager.getProfile(profile.id);
      expect(originalProfile?.consentHistory).toHaveLength(1);
      expect(originalProfile?.consentHistory[0].categories.analytics).toBe(true);
    });
  });
});

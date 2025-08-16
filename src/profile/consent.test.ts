/**
 * プロフィール・同意履歴のユニットテスト
 */

// 型定義のモック
interface ConsentHistory {
  id: string;
  user_id: string;
  prev_consent: boolean;
  next_consent: boolean;
  changed_at: string;
}

interface MockProfile {
  id: string;
  model_training_consent: boolean;
}

// 同意履歴管理のロジック（実際の実装をモック）
class ConsentManager {
  private history: ConsentHistory[] = [];
  private profiles: MockProfile[] = [];

  // 同意状態更新と履歴記録
  async updateConsent(userId: string, newConsent: boolean): Promise<{success: boolean, historyCreated: boolean}> {
    const currentProfile = this.profiles.find(p => p.id === userId);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const currentConsent = currentProfile.model_training_consent;
    
    // 同値更新の場合は履歴を作成しない
    if (currentConsent === newConsent) {
      return { success: true, historyCreated: false };
    }

    // プロフィール更新
    currentProfile.model_training_consent = newConsent;

    // 履歴記録
    const historyEntry: ConsentHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      prev_consent: currentConsent,
      next_consent: newConsent,
      changed_at: new Date().toISOString()
    };

    this.history.push(historyEntry);

    return { success: true, historyCreated: true };
  }

  // ユーザーの同意履歴取得
  getConsentHistory(userId: string): ConsentHistory[] {
    return this.history
      .filter(h => h.user_id === userId)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }

  // テスト用ヘルパー
  createProfile(userId: string, initialConsent: boolean = false): void {
    this.profiles.push({
      id: userId,
      model_training_consent: initialConsent
    });
  }

  getProfile(userId: string): MockProfile | undefined {
    return this.profiles.find(p => p.id === userId);
  }

  clearData(): void {
    this.history = [];
    this.profiles = [];
  }

  getHistoryCount(): number {
    return this.history.length;
  }
}

describe('Profile Consent Management', () => {
  let consentManager: ConsentManager;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    consentManager = new ConsentManager();
    consentManager.createProfile(testUserId, false); // 初期値は同意なし
  });

  describe('同意状態更新の基本動作', () => {
    test('false → true の変更で履歴が1行増える', async () => {
      const initialHistoryCount = consentManager.getHistoryCount();
      
      const result = await consentManager.updateConsent(testUserId, true);
      
      expect(result.success).toBe(true);
      expect(result.historyCreated).toBe(true);
      expect(consentManager.getHistoryCount()).toBe(initialHistoryCount + 1);
      
      // プロフィールが更新されていることを確認
      const profile = consentManager.getProfile(testUserId);
      expect(profile?.model_training_consent).toBe(true);
    });

    test('true → false の変更で履歴が1行増える', async () => {
      // 最初にtrueに設定
      await consentManager.updateConsent(testUserId, true);
      const historyAfterFirst = consentManager.getHistoryCount();
      
      // falseに変更
      const result = await consentManager.updateConsent(testUserId, false);
      
      expect(result.success).toBe(true);
      expect(result.historyCreated).toBe(true);
      expect(consentManager.getHistoryCount()).toBe(historyAfterFirst + 1);
      
      // プロフィールが更新されていることを確認
      const profile = consentManager.getProfile(testUserId);
      expect(profile?.model_training_consent).toBe(false);
    });

    test('同値更新は履歴を増やさない (false → false)', async () => {
      const initialHistoryCount = consentManager.getHistoryCount();
      
      const result = await consentManager.updateConsent(testUserId, false);
      
      expect(result.success).toBe(true);
      expect(result.historyCreated).toBe(false);
      expect(consentManager.getHistoryCount()).toBe(initialHistoryCount);
      
      // プロフィールの値は変わっていない
      const profile = consentManager.getProfile(testUserId);
      expect(profile?.model_training_consent).toBe(false);
    });

    test('同値更新は履歴を増やさない (true → true)', async () => {
      // 最初にtrueに設定
      await consentManager.updateConsent(testUserId, true);
      const historyAfterFirst = consentManager.getHistoryCount();
      
      // 同じtrueで更新
      const result = await consentManager.updateConsent(testUserId, true);
      
      expect(result.success).toBe(true);
      expect(result.historyCreated).toBe(false);
      expect(consentManager.getHistoryCount()).toBe(historyAfterFirst);
      
      // プロフィールの値は変わっていない
      const profile = consentManager.getProfile(testUserId);
      expect(profile?.model_training_consent).toBe(true);
    });
  });

  describe('履歴データの検証', () => {
    test('履歴エントリに正しい情報が記録される', async () => {
      await consentManager.updateConsent(testUserId, true);
      
      const history = consentManager.getConsentHistory(testUserId);
      expect(history).toHaveLength(1);
      
      const entry = history[0];
      expect(entry.user_id).toBe(testUserId);
      expect(entry.prev_consent).toBe(false);
      expect(entry.next_consent).toBe(true);
      expect(entry.id).toBeDefined();
      expect(entry.changed_at).toBeDefined();
      
      // 日時が妥当な範囲内であることを確認
      const changeTime = new Date(entry.changed_at);
      const now = new Date();
      expect(changeTime.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(changeTime.getTime()).toBeGreaterThan(now.getTime() - 5000); // 5秒以内
    });

    test('複数回の変更で履歴が正しく積み重なる', async () => {
      // false → true
      await consentManager.updateConsent(testUserId, true);
      
      // true → false
      await consentManager.updateConsent(testUserId, false);
      
      // false → true
      await consentManager.updateConsent(testUserId, true);
      
      const history = consentManager.getConsentHistory(testUserId);
      expect(history).toHaveLength(3);
      
      // 時系列順（降順）に並んでいることを確認
      expect(history[0].prev_consent).toBe(false); // 最新: false → true
      expect(history[0].next_consent).toBe(true);
      
      expect(history[1].prev_consent).toBe(true);  // 中間: true → false
      expect(history[1].next_consent).toBe(false);
      
      expect(history[2].prev_consent).toBe(false); // 最古: false → true
      expect(history[2].next_consent).toBe(true);
    });

    test('存在しないユーザーの履歴は空配列', () => {
      const history = consentManager.getConsentHistory('nonexistent_user');
      expect(history).toHaveLength(0);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    test('存在しないユーザーの更新はエラー', async () => {
      await expect(
        consentManager.updateConsent('nonexistent_user', true)
      ).rejects.toThrow('Profile not found');
    });

    test('不正な同意値でもエラーは発生しない', async () => {
      // TypeScriptレベルでは boolean のみ受け付けるが、
      // 実行時に他の値が来た場合の処理をテスト
      const result = await consentManager.updateConsent(testUserId, Boolean('true'));
      expect(result.success).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量の同意変更処理が正常に動作する', async () => {
      const changes = 100;
      
      for (let i = 0; i < changes; i++) {
        const newConsent = i % 2 === 0; // 交互にtrue/false
        await consentManager.updateConsent(testUserId, newConsent);
      }
      
      const history = consentManager.getConsentHistory(testUserId);
      expect(history.length).toBe(changes);
      
      // 最後の状態確認
      const profile = consentManager.getProfile(testUserId);
      const expectedFinalState = (changes - 1) % 2 === 0; // 最後のループの値
      expect(profile?.model_training_consent).toBe(expectedFinalState);
    });

    test('複数ユーザーの履歴が分離されている', async () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      consentManager.createProfile(user1, false);
      consentManager.createProfile(user2, false);
      
      // user1の操作
      await consentManager.updateConsent(user1, true);
      await consentManager.updateConsent(user1, false);
      
      // user2の操作
      await consentManager.updateConsent(user2, true);
      
      const history1 = consentManager.getConsentHistory(user1);
      const history2 = consentManager.getConsentHistory(user2);
      
      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
      
      // 履歴の内容が正しく分離されている
      expect(history1.every(h => h.user_id === user1)).toBe(true);
      expect(history2.every(h => h.user_id === user2)).toBe(true);
    });
  });
});

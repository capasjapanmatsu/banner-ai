// 開発用のメモリストレージ（LP内で共有）
// TODO: 本番では Redis や Database に置き換える

export interface RegistrationTokenPayload {
  pc: string; // primary_category
  sc?: string[]; // secondary_categories
  consent?: boolean; // model_training_consent
  source: 'LP';
  timestamp: string;
}

export interface RegistrationToken {
  token: string;
  payload: RegistrationTokenPayload;
  expires_at: string;
  used_at?: string;
}

class TokenStorage {
  private storage = new Map<string, RegistrationToken>();

  // トークン生成
  createToken(payload: RegistrationTokenPayload): string {
    const token = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ttlMinutes = parseInt(process.env.TOKEN_TTL_MINUTES || '15');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const tokenData: RegistrationToken = {
      token,
      payload,
      expires_at: expiresAt.toISOString()
    };

    this.storage.set(token, tokenData);
    return token;
  }

  // トークン取得
  getToken(token: string): RegistrationToken | undefined {
    return this.storage.get(token);
  }

  // トークンの有効性チェック
  isValid(token: string): boolean {
    const data = this.storage.get(token);
    if (!data) return false;
    if (new Date(data.expires_at) < new Date()) return false;
    if (data.used_at) return false;
    return true;
  }

  // トークンの期限切れチェック
  isExpired(token: string): boolean {
    const data = this.storage.get(token);
    if (!data) return true;
    return new Date(data.expires_at) < new Date();
  }

  // トークンを消費済みとしてマーク
  markAsUsed(token: string): boolean {
    const data = this.storage.get(token);
    if (!data) return false;
    if (new Date(data.expires_at) < new Date()) return false;
    if (data.used_at) return false;

    data.used_at = new Date().toISOString();
    this.storage.set(token, data);
    return true;
  }

  set(token: string, data: RegistrationToken): void {
    this.storage.set(token, data);
  }

  get(token: string): RegistrationToken | undefined {
    return this.storage.get(token);
  }

  delete(token: string): boolean {
    return this.storage.delete(token);
  }

  // 期限切れトークンのクリーンアップ
  cleanup(): void {
    const now = new Date();
    for (const [token, data] of this.storage.entries()) {
      if (new Date(data.expires_at) < now) {
        this.storage.delete(token);
      }
    }
  }

  // 統計情報取得（開発用）
  getStats(): { total: number; expired: number; used: number } {
    const now = new Date();
    let expired = 0;
    let used = 0;

    for (const data of this.storage.values()) {
      if (new Date(data.expires_at) < now) {
        expired++;
      }
      if (data.used_at) {
        used++;
      }
    }

    return {
      total: this.storage.size,
      expired,
      used
    };
  }
}

// シングルトンインスタンス
export const tokenStorage = new TokenStorage();

// 定期クリーンアップ（開発用）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    tokenStorage.cleanup();
  }, 5 * 60 * 1000); // 5分毎
}

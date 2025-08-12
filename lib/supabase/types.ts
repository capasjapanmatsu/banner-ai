export interface Profile {
  user_id: string;
  shop_name?: string;
  created_at: string;
}

export interface UserStyleProfile {
  user_id: string;
  font_prefs: Record<string, unknown>;
  color_prefs: Record<string, unknown>;
  layout_prefs: Record<string, unknown>;
  segments: Record<string, unknown>;
  updated_at: string;
}

export interface BannerEvent {
  id: string;
  user_id: string;
  audience?: string;
  event_type: 'proposal' | 'tweak' | 'approve';
  spec_before?: Record<string, unknown>;
  spec_after?: Record<string, unknown>;
  deltas?: Record<string, unknown>;
  score?: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'user_id' | 'created_at'>>;
      };
      user_style_profile: {
        Row: UserStyleProfile;
        Insert: Omit<UserStyleProfile, 'updated_at'>;
        Update: Partial<Omit<UserStyleProfile, 'user_id'>>;
      };
      banner_events: {
        Row: BannerEvent;
        Insert: Omit<BannerEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<BannerEvent, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

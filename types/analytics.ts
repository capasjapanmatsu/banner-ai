// イベントトラッキング用の型定義

export type EventType = 
  | 'onboarding_category_selected'
  | 'generation_created'
  | 'generation_completed' 
  | 'generation_interrupted'
  | 'asset_adopted'
  | 'asset_rejected'
  | 'manual_edit_applied'
  | 'banner_exported'
  | 'preset_selected'
  | 'image_uploaded'
  | 'logo_uploaded'
  | 'session_started'
  | 'session_ended'
  | 'preset_preview_opened'
  | 'preset_applied'
  | 'preset_snapshot_saved'
  | 'preset_snapshot_restored';

export interface BaseEventData {
  timestamp?: string;
  source?: 'lp' | 'app' | 'dev_page' | 'testing';
  version?: string;
}

export interface OnboardingCategorySelectedEvent extends BaseEventData {
  primary_category: string;
  secondary_categories?: string[];
  source_page: 'lp_intake' | 'app_signup';
  consent_given?: boolean;
}

export interface GenerationEvent extends BaseEventData {
  generation_id: string;
  preset_id?: string;
  image_count: number;
  processing_time_ms?: number;
  error_code?: string;
  error_message?: string;
}

export interface AssetEvent extends BaseEventData {
  asset_id: string;
  asset_type: 'banner' | 'preset' | 'image';
  generation_id?: string;
  reason?: string;
  rating?: number;
}

export interface ManualEditEvent extends BaseEventData {
  edit_type: 'move' | 'resize' | 'rotate' | 'delete' | 'add_text' | 'change_preset';
  target_element: 'image' | 'text' | 'logo' | 'background';
  edit_count: number;
  duration_ms?: number;
}

export interface PresetSelectedEvent extends BaseEventData {
  preset_id: string;
  preset_category: string;
  selection_source: 'category_default' | 'user_selection';
}

export interface UploadEvent extends BaseEventData {
  file_size_bytes: number;
  file_type: string;
  upload_duration_ms?: number;
  processing_duration_ms?: number;
}

export interface SessionEvent extends BaseEventData {
  session_duration_ms?: number;
  page_views?: number;
  actions_count?: number;
}

export interface PresetDeveloperEvent extends BaseEventData {
  category: string;
  preset_name?: string;
  snapshot_id?: string;
}

export type EventData = 
  | OnboardingCategorySelectedEvent
  | GenerationEvent
  | AssetEvent
  | ManualEditEvent
  | PresetSelectedEvent
  | UploadEvent
  | SessionEvent
  | PresetDeveloperEvent;

export interface UserEvent {
  id?: string;
  user_id: string;
  event_type: EventType;
  event_data: EventData;
  primary_category?: string;
  session_id?: string;
  created_at?: string;
}

// 分析用の集計データ型
export interface CategoryAnalytics {
  primary_category: string;
  adoption_count: number;
  rejection_count: number;
  generation_count: number;
  edit_count: number;
  unique_users: number;
  date: string;
}

export interface DailySummary {
  date: string;
  event_type: EventType;
  primary_category: string;
  event_count: number;
  unique_users: number;
  unique_sessions: number;
}

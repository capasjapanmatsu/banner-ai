-- Supabaseコンソールで実行するSQL
-- データベース設計：アカウント、スタイルプロファイル、生成イベント

-- アカウントテーブル
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- スタイルプロファイルテーブル
create table if not exists account_style_profile (
  account_id uuid primary key references accounts(id) on delete cascade,
  font_prefs jsonb default '{}'::jsonb,
  color_prefs jsonb default '{}'::jsonb,
  layout_prefs jsonb default '{}'::jsonb,
  segments jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 生成イベントテーブル
create table if not exists banner_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  audience text,
  event_type text check (event_type in ('proposal','tweak','approve')),
  spec_before jsonb,
  spec_after jsonb,
  deltas jsonb,
  score int,
  created_at timestamptz default now()
);

-- インデックス作成
create index if not exists banner_events_acc_idx on banner_events(account_id, created_at desc);

-- 初期データ（デモアカウント）
insert into accounts (id, name) values ('demo-account', 'Demo Account') on conflict do nothing;

-- 最小スキーマ（「ユーザー＝1店舗」想定、あとで複数メンバー化可）
-- Supabase SQLエディタで実行してください

-- プロファイル（auth.users と1:1）
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shop_name text,
  created_at timestamptz default now()
);

-- 学習結果（ユーザー別"好み"）
create table if not exists user_style_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  font_prefs jsonb default '{}'::jsonb,
  color_prefs jsonb default '{}'::jsonb,
  layout_prefs jsonb default '{}'::jsonb,
  segments jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 生成イベント（差分ログ）
create table if not exists banner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text,
  event_type text check (event_type in ('proposal','tweak','approve')),
  spec_before jsonb,
  spec_after jsonb,
  deltas jsonb,
  score int,
  created_at timestamptz default now()
);

-- インデックス作成
create index if not exists banner_events_user_idx on banner_events(user_id, created_at desc);

-- RLS有効化
alter table profiles enable row level security;
alter table user_style_profile enable row level security;
alter table banner_events enable row level security;

-- RLS: 自分の行だけ読める/書ける（既存のポリシーがあれば置き換え）
drop policy if exists "profiles self" on profiles;
create policy "profiles self" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "style self" on user_style_profile;  
create policy "style self" on user_style_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events self" on banner_events;
create policy "events self" on banner_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

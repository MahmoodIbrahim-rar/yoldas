-- ============================================================
-- Yoldaş — supabase/schema.sql
-- شغّل هذا الملف مرة واحدة في SQL Editor داخل مشروع Supabase الخاص بك.
-- آمن لإعادة التشغيل (يستخدم IF NOT EXISTS / CREATE OR REPLACE قدر الإمكان).
-- لا يحذف أي بيانات مستخدمين موجودة.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============== profiles ==============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  goal text,
  activity_level text,
  alias text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============== daily_logs ==============
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  water_cups integer not null default 0,
  calorie_goal integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ============== meals ==============
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  name text not null,
  meal_type text,
  calories_estimate integer,
  notes text,
  created_at timestamptz not null default now()
);

-- ============== exercises ==============
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  title text not null,
  minutes integer,
  calories_estimate integer,
  notes text,
  created_at timestamptz not null default now()
);

-- ============== weight_logs ==============
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric,
  created_at timestamptz not null default now()
);

-- ============== plans ==============
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('food', 'workout')),
  answers_json jsonb not null default '{}'::jsonb,
  plan_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============== assistant_messages ==============
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============== community_messages ==============
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============== notification_preferences ==============
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminder_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — كل مستخدم يرى ويكتب صفوفه فقط
-- ============================================================

alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;
alter table public.exercises enable row level security;
alter table public.weight_logs enable row level security;
alter table public.plans enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.community_messages enable row level security;
alter table public.notification_preferences enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- daily_logs
drop policy if exists "daily_logs_all_own" on public.daily_logs;
create policy "daily_logs_all_own" on public.daily_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meals
drop policy if exists "meals_all_own" on public.meals;
create policy "meals_all_own" on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exercises
drop policy if exists "exercises_all_own" on public.exercises;
create policy "exercises_all_own" on public.exercises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weight_logs
drop policy if exists "weight_logs_all_own" on public.weight_logs;
create policy "weight_logs_all_own" on public.weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plans
drop policy if exists "plans_all_own" on public.plans;
create policy "plans_all_own" on public.plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assistant_messages
drop policy if exists "assistant_messages_all_own" on public.assistant_messages;
create policy "assistant_messages_all_own" on public.assistant_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification_preferences
drop policy if exists "notification_preferences_all_own" on public.notification_preferences;
create policy "notification_preferences_all_own" on public.notification_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- community_messages: قراءة عامة لكل مستخدم مسجّل (حتى لو مجهول)، وكتابة لصفوفه فقط.
-- لا نعرض user_id في الواجهة أبدًا — فقط alias وcontent.
drop policy if exists "community_messages_select_all" on public.community_messages;
create policy "community_messages_select_all" on public.community_messages for select
  using (auth.role() = 'authenticated');
drop policy if exists "community_messages_insert_own" on public.community_messages;
create policy "community_messages_insert_own" on public.community_messages for insert
  with check (auth.uid() = user_id);
drop policy if exists "community_messages_delete_own" on public.community_messages;
create policy "community_messages_delete_own" on public.community_messages for delete
  using (auth.uid() = user_id);

-- ============================================================
-- فهارس مساعدة
-- ============================================================
create index if not exists idx_meals_user_date on public.meals(user_id, log_date);
create index if not exists idx_exercises_user_date on public.exercises(user_id, log_date);
create index if not exists idx_plans_user_active on public.plans(user_id, is_active);
create index if not exists idx_assistant_messages_user on public.assistant_messages(user_id, created_at);
create index if not exists idx_community_messages_created on public.community_messages(created_at desc);

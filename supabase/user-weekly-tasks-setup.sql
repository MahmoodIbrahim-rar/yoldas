-- ============================================================
-- Yoldaş — 7-Day Guided Journey System Setup
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- ============================================================

create table if not exists public.user_weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 7),
  day_mask smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_weekly_task unique (user_id, day_number)
);

alter table public.user_weekly_tasks enable row level security;

drop policy if exists "user_weekly_tasks_own_all" on public.user_weekly_tasks;
create policy "user_weekly_tasks_own_all" on public.user_weekly_tasks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create index if not exists idx_user_weekly_tasks_user_day
  on public.user_weekly_tasks(user_id, day_number);

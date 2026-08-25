-- ============================================================
-- Yoldaş — Gym Mode setup
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- يضيف جداول جديدة فقط ولا يعدّل أو يحذف بياناتك الحالية.
-- ============================================================

create table if not exists public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  title text not null check (char_length(title) between 1 and 120),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.gym_sessions(id) on delete cascade,
  exercise_name text not null check (char_length(exercise_name) between 1 and 120),
  set_number integer not null check (set_number between 1 and 50),
  reps integer not null check (reps between 1 and 500),
  weight_kg numeric(7,2) not null default 0 check (weight_kg >= 0 and weight_kg <= 1000),
  created_at timestamptz not null default now()
);

alter table public.gym_sessions enable row level security;
alter table public.gym_sets enable row level security;

drop policy if exists "gym_sessions_all_own" on public.gym_sessions;
create policy "gym_sessions_all_own" on public.gym_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "gym_sets_all_own_session" on public.gym_sets;
create policy "gym_sets_all_own_session" on public.gym_sets for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.gym_sessions
      where gym_sessions.id = gym_sets.session_id
        and gym_sessions.user_id = auth.uid()
    )
  );

create index if not exists idx_gym_sessions_user_date
  on public.gym_sessions(user_id, session_date desc);
create index if not exists idx_gym_sets_user_exercise_created
  on public.gym_sets(user_id, exercise_name, created_at desc);
create unique index if not exists idx_gym_sets_unique_order
  on public.gym_sets(session_id, exercise_name, set_number);

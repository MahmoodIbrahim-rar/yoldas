-- Yoldaş — meals compatibility repair
-- Safe to run more than once. It does not delete rows, tables, accounts, or photos.
-- It only adds missing columns used by the editable food catalog and restores owner-only access.

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

alter table public.meals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.meals add column if not exists log_date date default current_date;
alter table public.meals add column if not exists name text;
alter table public.meals add column if not exists meal_type text;
alter table public.meals add column if not exists calories_estimate integer;
alter table public.meals add column if not exists notes text;
alter table public.meals add column if not exists created_at timestamptz default now();

alter table public.meals enable row level security;

drop policy if exists "meals_all_own" on public.meals;
create policy "meals_all_own" on public.meals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_meals_user_date on public.meals(user_id, log_date);

-- Refresh the API schema cache so the newly present columns are available immediately.
notify pgrst, 'reload schema';

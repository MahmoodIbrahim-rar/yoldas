-- Yoldaş — Opt-in motivation support
-- Messages are written by real users who explicitly opt in. No rankings, fake users, or impersonation.

create table if not exists public.motivation_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 12 and 280),
  is_opted_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.motivation_notes enable row level security;

drop policy if exists "Users manage own motivation notes" on public.motivation_notes;
drop policy if exists "Users read opted in motivation notes" on public.motivation_notes;

create policy "Users manage own motivation notes"
on public.motivation_notes for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users read opted in motivation notes"
on public.motivation_notes for select
using (is_opted_in = true);

create index if not exists idx_motivation_notes_opted_in
on public.motivation_notes(is_opted_in, created_at desc);

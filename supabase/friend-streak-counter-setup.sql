-- ============================================================
-- Yoldaş — عداد الستريك المتبادل بين الأصدقاء
-- شغّل هذا الملف مرة واحدة بعد friends-recovery-setup.sql.
-- لا يضيف أي صور عامة ولا يغيّر خصوصية الستريك.
-- ============================================================

create table if not exists public.friend_streaks (
  friendship_id uuid primary key references public.friendships(id) on delete cascade,
  streak_count integer not null default 0 check (streak_count >= 0),
  last_completed_day date,
  updated_at timestamptz not null default now()
);

alter table public.friend_streaks enable row level security;

drop policy if exists "friend_streaks_participant_only" on public.friend_streaks;
create policy "friend_streaks_participant_only" on public.friend_streaks
  for select using (
    exists (
      select 1 from public.friendships
      where friendships.id = friend_streaks.friendship_id
        and friendships.status = 'accepted'
        and auth.uid() in (friendships.requester_user_id, friendships.addressee_user_id)
    )
  );

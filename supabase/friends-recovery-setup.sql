-- ============================================================
-- Yoldaş — استرجاع الحساب + أصدقاء وستريك صور مؤقتة
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- لا يحذف بياناتك الحالية ولا يفتح صورًا أو رسائل للعامة.
-- ============================================================

alter table public.profiles
  add column if not exists recovery_email text,
  add column if not exists friend_discovery boolean not null default true;

create unique index if not exists idx_profiles_recovery_email_unique
  on public.profiles (lower(recovery_email))
  where recovery_email is not null;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  addressee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_user_id <> addressee_user_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_user_id, addressee_user_id), greatest(requester_user_id, addressee_user_id));

create table if not exists public.friend_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.streak_snaps (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text check (char_length(caption) <= 140),
  sent_day date not null default current_date,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  opened_at timestamptz,
  check (sender_user_id <> recipient_user_id),
  check (expires_at <= created_at + interval '24 hours 5 minutes'),
  unique (sender_user_id, recipient_user_id, sent_day)
);

create index if not exists streak_snaps_recipient_expiry_idx
  on public.streak_snaps (recipient_user_id, expires_at desc);

create table if not exists public.friend_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  streak_snap_id uuid references public.streak_snaps(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 400),
  created_at timestamptz not null default now(),
  check (reporter_user_id <> reported_user_id)
);

create table if not exists public.snap_reactions (
  id uuid primary key default gen_random_uuid(),
  snap_id uuid not null references public.streak_snaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('fire', 'clap', 'heart')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snap_id, user_id)
);

alter table public.friendships enable row level security;
alter table public.friend_blocks enable row level security;
alter table public.streak_snaps enable row level security;
alter table public.friend_reports enable row level security;
alter table public.snap_reactions enable row level security;

drop policy if exists "friendships_participant_only" on public.friendships;
create policy "friendships_participant_only" on public.friendships
  for select using (auth.uid() in (requester_user_id, addressee_user_id));

drop policy if exists "friend_blocks_owner_only" on public.friend_blocks;
create policy "friend_blocks_owner_only" on public.friend_blocks
  for select using (auth.uid() = blocker_user_id);

drop policy if exists "streak_snaps_participant_only" on public.streak_snaps;
create policy "streak_snaps_participant_only" on public.streak_snaps
  for select using (auth.uid() in (sender_user_id, recipient_user_id));

drop policy if exists "friend_reports_reporter_only" on public.friend_reports;
create policy "friend_reports_reporter_only" on public.friend_reports
  for select using (auth.uid() = reporter_user_id);

drop policy if exists "snap_reactions_participant_only" on public.snap_reactions;
create policy "snap_reactions_participant_only" on public.snap_reactions
  for select using (
    exists (
      select 1 from public.streak_snaps
      where streak_snaps.id = snap_reactions.snap_id
        and auth.uid() in (streak_snaps.sender_user_id, streak_snaps.recipient_user_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yoldas-streak-snaps', 'yoldas-streak-snaps', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/webp'];

drop policy if exists "streak_snap_upload_own_folder" on storage.objects;
create policy "streak_snap_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'yoldas-streak-snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "streak_snap_delete_own_folder" on storage.objects;
create policy "streak_snap_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'yoldas-streak-snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- لا توجد سياسة select مباشرة: الروابط الموقعة تصدر فقط من social-service.
-- تحذف الدالة نفسها الصور والسجلات المنتهية أثناء أي طلب مجتمع موثّق.
-- لا يوجد Cron عام أو رابط تنظيف يمكن استدعاؤه بلا تسجيل دخول.

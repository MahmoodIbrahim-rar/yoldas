-- ============================================================
-- Yoldaş — تحديات حركة خاصة بين الأصدقاء بأقل استخدام للبيانات
-- شغّل هذا الملف بعد friends-recovery-setup.sql مرة واحدة فقط.
-- لا يضيف صورًا أو فيديو أو بثًا مباشرًا أو ترتيبًا عامًا.
-- ============================================================

alter table public.profiles
  add column if not exists challenge_wins smallint not null default 0 check (challenge_wins >= 0);

create table if not exists public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null check (template_key in ('pushups', 'squats', 'plank', 'walk', 'chair_stands')),
  duration_days smallint not null check (duration_days in (3, 7)),
  required_days smallint not null check (required_days > 0 and required_days <= duration_days),
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists friend_challenges_creator_status_idx
  on public.friend_challenges (creator_user_id, status, created_at desc);
create index if not exists friend_challenges_status_end_idx
  on public.friend_challenges (status, end_date);

create table if not exists public.friend_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.friend_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  completed_days_mask integer not null default 0 check (completed_days_mask >= 0 and completed_days_mask < 128),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists friend_challenge_participants_user_idx
  on public.friend_challenge_participants (user_id, challenge_id);
create index if not exists friend_challenge_participants_challenge_idx
  on public.friend_challenge_participants (challenge_id);

-- المستخدم يسجّل «أنجزت اليوم» مرة واحدة فقط. الـbitmask يخزّن أيام التحدي
-- في رقم صغير داخل صف المشارك بدل إنشاء صف لكل يوم أو لكل عدة.
create or replace function public.claim_friend_challenge_day(p_challenge_id uuid)
returns table (challenge_id uuid, completed_days_mask integer, day_number smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  challenge_row public.friend_challenges%rowtype;
  position integer;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into challenge_row
  from public.friend_challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;
  if challenge_row.status <> 'active' or challenge_row.start_date is null or challenge_row.end_date is null then
    raise exception 'CHALLENGE_NOT_ACTIVE';
  end if;
  if current_date < challenge_row.start_date or current_date > challenge_row.end_date then
    raise exception 'CHALLENGE_OUTSIDE_DATE';
  end if;

  position := current_date - challenge_row.start_date;
  return query
  update public.friend_challenge_participants
  set completed_days_mask = completed_days_mask | (1 << position),
      updated_at = now()
  where challenge_id = p_challenge_id
    and user_id = actor_id
    and accepted_at is not null
  returning friend_challenge_participants.challenge_id,
            friend_challenge_participants.completed_days_mask,
            (position + 1)::smallint;

  if not found then
    raise exception 'CHALLENGE_PARTICIPANT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.claim_friend_challenge_day(uuid) from public;
grant execute on function public.claim_friend_challenge_day(uuid) to authenticated;

-- تمنح فوزًا واحدًا فقط عند وصول المشارك للأيام المطلوبة.
-- اللون والمظهر يشتقان من challenge_wins داخل الواجهة، لذلك لا نحتاج جدول جوائز.
create or replace function public.protect_challenge_wins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.challenge_wins is distinct from old.challenge_wins
    and coalesce(current_setting('app.yoldas_challenge_award', true), '') <> 'allowed' then
    raise exception 'CHALLENGE_WINS_MANAGED_BY_SERVICE';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_challenge_wins_update on public.profiles;
create trigger protect_challenge_wins_update
before update of challenge_wins on public.profiles
for each row execute function public.protect_challenge_wins();

create or replace function public.award_friend_challenge_win(p_challenge_id uuid)
returns table (challenge_wins smallint, rewarded_now boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  challenge_row public.friend_challenges%rowtype;
  participant_row public.friend_challenge_participants%rowtype;
  probe integer;
  completed_count integer := 0;
  updated_wins smallint;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into challenge_row
  from public.friend_challenges
  where id = p_challenge_id
  for update;
  if not found or challenge_row.status not in ('active', 'completed') then
    raise exception 'CHALLENGE_NOT_ACTIVE';
  end if;

  select * into participant_row
  from public.friend_challenge_participants
  where challenge_id = p_challenge_id
    and user_id = actor_id
    and accepted_at is not null
  for update;
  if not found then
    raise exception 'CHALLENGE_PARTICIPANT_NOT_FOUND';
  end if;

  probe := participant_row.completed_days_mask;
  while probe > 0 loop
    completed_count := completed_count + (probe & 1);
    probe := probe >> 1;
  end loop;
  if completed_count < challenge_row.required_days then
    select challenge_wins into updated_wins from public.profiles where id = actor_id;
    return query select coalesce(updated_wins, 0)::smallint, false;
    return;
  end if;

  if participant_row.rewarded_at is null then
    update public.friend_challenge_participants
    set rewarded_at = now(), updated_at = now()
    where id = participant_row.id;
    perform set_config('app.yoldas_challenge_award', 'allowed', true);
    update public.profiles
    set challenge_wins = least(challenge_wins + 1, 32767)
    where id = actor_id
    returning profiles.challenge_wins into updated_wins;
    return query select coalesce(updated_wins, 0)::smallint, true;
    return;
  end if;

  select challenge_wins into updated_wins from public.profiles where id = actor_id;
  return query select coalesce(updated_wins, 0)::smallint, false;
end;
$$;

revoke all on function public.award_friend_challenge_win(uuid) from public;
grant execute on function public.award_friend_challenge_win(uuid) to authenticated;

-- لا توجد سياسات select أو insert أو update مباشرة عن قصد.
-- خدمة social-service هي التي تتحقق من الأصدقاء والحظر والحدود والجوائز.
alter table public.friend_challenges enable row level security;
alter table public.friend_challenge_participants enable row level security;

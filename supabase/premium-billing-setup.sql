-- Yoldaş Premium (Türkiye) — run once in Supabase SQL Editor.
-- Creates only small subscription, usage, code and billing-event records.
-- It never stores card data, Gemini keys, photos, or raw Premium codes.

create extension if not exists "pgcrypto";

create table if not exists public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'premium')),
  premium_until timestamptz,
  source text not null default 'none' check (source in ('none', 'code', 'iyzico')),
  provider_customer_ref text,
  provider_subscription_ref text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((tier = 'free' and premium_until is null) or (tier = 'premium' and premium_until is not null))
);

create table if not exists public.premium_plan_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('plan_create', 'plan_revise')),
  reserved_at timestamptz not null default now()
);

create index if not exists idx_premium_plan_usage_window on public.premium_plan_usage_events (user_id, action, reserved_at desc);

create table if not exists public.premium_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  grant_days integer not null default 30 check (grant_days = 30),
  usage_limit integer not null default 1 check (usage_limit between 1 and 100000),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.premium_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.premium_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_days integer not null check (grant_days = 30),
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create unique index if not exists idx_premium_one_code_per_user on public.premium_code_redemptions (user_id);

-- Stores only a counter for the latest one-hour code-redemption window, never the supplied code.
create table if not exists public.premium_code_attempt_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default date_trunc('hour', now()),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('iyzico')),
  provider_event_ref text not null,
  event_type text not null,
  subscription_ref text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  unique (provider, provider_event_ref)
);

alter table public.premium_entitlements enable row level security;
alter table public.premium_plan_usage_events enable row level security;
alter table public.premium_codes enable row level security;
alter table public.premium_code_redemptions enable row level security;
alter table public.premium_code_attempt_windows enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "premium_entitlements_read_own" on public.premium_entitlements;
create policy "premium_entitlements_read_own" on public.premium_entitlements
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "premium_usage_read_own" on public.premium_plan_usage_events;
create policy "premium_usage_read_own" on public.premium_plan_usage_events
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "premium_redemptions_read_own" on public.premium_code_redemptions;
create policy "premium_redemptions_read_own" on public.premium_code_redemptions
  for select to authenticated using (auth.uid() = user_id);

-- Atomically reserve one plan creation or revision within a rolling 30-day window.
-- Limits are derived in the database, so a caller cannot increase its allowance.
drop function if exists public.reserve_premium_monthly_action(uuid, text, integer);
create or replace function public.reserve_premium_monthly_action(p_user_id uuid, p_action text)
returns table(allowed boolean, used_actions integer)
language plpgsql security definer set search_path = public
as $$
declare
  used_actions integer;
  action_limit integer;
  premium_active boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'not allowed'; end if;
  if p_action not in ('plan_create', 'plan_revise') then raise exception 'invalid request'; end if;
  select exists (
    select 1 from public.premium_entitlements
    where user_id = p_user_id and tier = 'premium' and premium_until > now()
  ) into premium_active;
  action_limit := case
    when p_action = 'plan_create' and premium_active then 4
    when p_action = 'plan_create' then 1
    when premium_active then 12
    else 2
  end;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action));
  select count(*) into used_actions from public.premium_plan_usage_events
    where user_id = p_user_id and action = p_action and reserved_at >= now() - interval '30 days';
  if used_actions >= action_limit then
    return query select false, used_actions;
    return;
  end if;
  insert into public.premium_plan_usage_events (user_id, action) values (p_user_id, p_action);
  return query select true, used_actions + 1;
end;
$$;

revoke all on function public.reserve_premium_monthly_action(uuid, text) from public;
grant execute on function public.reserve_premium_monthly_action(uuid, text) to authenticated;

create or replace function public.release_premium_monthly_action(p_user_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'not allowed'; end if;
  if p_action not in ('plan_create', 'plan_revise') then raise exception 'invalid action'; end if;
  delete from public.premium_plan_usage_events
  where id in (
    select id from public.premium_plan_usage_events
    where user_id = p_user_id and action = p_action and reserved_at >= now() - interval '30 days'
    order by reserved_at desc limit 1
  );
end;
$$;
revoke all on function public.release_premium_monthly_action(uuid, text) from public;
grant execute on function public.release_premium_monthly_action(uuid, text) to authenticated;

-- Redeem a raw code only inside this transaction; only its SHA-256 hash is stored.
create or replace function public.redeem_premium_code(p_code text)
returns table(ok boolean, code text, premium_until timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  normalized_code text := upper(trim(coalesce(p_code, '')));
  hashed_code text;
  matched public.premium_codes%rowtype;
  current_until timestamptz;
  new_until timestamptz;
  attempt_count integer;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  insert into public.premium_code_attempt_windows (user_id, window_started_at, attempts, updated_at)
  values (auth.uid(), date_trunc('hour', now()), 1, now())
  on conflict (user_id) do update set
    attempts = case
      when public.premium_code_attempt_windows.window_started_at < date_trunc('hour', now()) then 1
      else public.premium_code_attempt_windows.attempts + 1
    end,
    window_started_at = case
      when public.premium_code_attempt_windows.window_started_at < date_trunc('hour', now()) then date_trunc('hour', now())
      else public.premium_code_attempt_windows.window_started_at
    end,
    updated_at = now()
  returning attempts into attempt_count;
  if attempt_count > 8 then return query select false, 'REDEEM_RATE_LIMIT', null::timestamptz; return; end if;
  if normalized_code !~ '^[A-Z0-9-]{8,64}$' then return query select false, 'INVALID_CODE', null::timestamptz; return; end if;
  hashed_code := encode(digest(normalized_code, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtext(hashed_code));
  select * into matched from public.premium_codes where code_hash = hashed_code for update;
  if not found or not matched.active or (matched.starts_at is not null and matched.starts_at > now()) or (matched.expires_at is not null and matched.expires_at <= now()) then
    return query select false, 'INVALID_CODE', null::timestamptz; return;
  end if;
  if matched.redeemed_count >= matched.usage_limit then return query select false, 'CODE_EXHAUSTED', null::timestamptz; return; end if;
  if exists (select 1 from public.premium_code_redemptions where user_id = auth.uid()) then return query select false, 'CODE_ALREADY_USED', null::timestamptz; return; end if;
  select premium_until into current_until from public.premium_entitlements where user_id = auth.uid() for update;
  if current_until is not null and current_until > now() then return query select false, 'PREMIUM_ALREADY_ACTIVE', current_until; return; end if;
  new_until := now() + make_interval(days => matched.grant_days);
  insert into public.premium_code_redemptions (code_id, user_id, grant_days) values (matched.id, auth.uid(), matched.grant_days);
  update public.premium_codes set redeemed_count = redeemed_count + 1 where id = matched.id;
  insert into public.premium_entitlements (user_id, tier, premium_until, source, updated_at)
  values (auth.uid(), 'premium', new_until, 'code', now())
  on conflict (user_id) do update set tier = 'premium', premium_until = excluded.premium_until, source = 'code', updated_at = now();
  return query select true, 'CODE_REDEEMED', new_until;
end;
$$;

revoke all on function public.redeem_premium_code(text) from public;
grant execute on function public.redeem_premium_code(text) to authenticated;

create index if not exists idx_premium_entitlements_until on public.premium_entitlements (premium_until);
create index if not exists idx_premium_code_active_dates on public.premium_codes (active, expires_at);
create index if not exists idx_billing_events_subscription on public.billing_events (subscription_ref, received_at desc);

-- Create a code manually without storing its raw form. Replace YOUR-CODE before running:
-- insert into public.premium_codes (code_hash) values (encode(digest(upper(trim('YOUR-CODE')), 'sha256'), 'hex'));

-- Yoldaş — حدود Miri اليومية (تشغيل واحد داخل Supabase SQL Editor)
-- يحمي حصة Gemini من الاستهلاك المفرط. لا يحذف أي بيانات مستخدم.

create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  miri_text_requests integer not null default 0 check (miri_text_requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;

drop policy if exists "ai_usage_owner_read" on public.ai_daily_usage;
create policy "ai_usage_owner_read" on public.ai_daily_usage
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.reserve_miri_text_request(p_user_id uuid, p_limit integer default 5)
returns table(allowed boolean, used_requests integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'invalid limit';
  end if;

  insert into public.ai_daily_usage (user_id, usage_date, miri_text_requests)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date) do update
    set miri_text_requests = public.ai_daily_usage.miri_text_requests + 1,
        updated_at = now()
    where public.ai_daily_usage.miri_text_requests < p_limit
  returning miri_text_requests into next_count;

  if found then
    return query select true, next_count;
  else
    select miri_text_requests into next_count
      from public.ai_daily_usage
      where user_id = p_user_id and usage_date = current_date;
    return query select false, coalesce(next_count, p_limit);
  end if;
end;
$$;

create or replace function public.release_miri_text_request(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;
  update public.ai_daily_usage
    set miri_text_requests = greatest(0, miri_text_requests - 1), updated_at = now()
    where user_id = p_user_id and usage_date = current_date;
end;
$$;

revoke all on function public.reserve_miri_text_request(uuid, integer) from public;
revoke all on function public.release_miri_text_request(uuid) from public;
grant execute on function public.reserve_miri_text_request(uuid, integer) to authenticated;
grant execute on function public.release_miri_text_request(uuid) to authenticated;

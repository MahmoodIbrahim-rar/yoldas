-- ============================================================
-- Yoldaş — إضافة النوع إلى الملف الشخصي
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor قبل نشر account-auth.
-- لا يحذف حسابات أو بيانات قائمة؛ الحسابات القديمة تظل بقيمة NULL حتى يكمل صاحبها الاختيار من الواجهة.
-- ============================================================

alter table public.profiles
  add column if not exists gender text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_gender_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_gender_allowed
      check (gender is null or gender in ('male', 'female'));
  end if;
end $$;

comment on column public.profiles.gender is
  'Required for new Yoldaş accounts: male or female. Used only as limited health-plan and wording context; never exposed in community or friend views.';

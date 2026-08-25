-- ============================================================
-- Yoldaş — حسابات باسم المستخدم وكلمة المرور فقط
-- شغّل هذا الملف مرة واحدة داخل Supabase SQL Editor.
-- لا يحذف أي جدول أو بيانات قائمة.
-- ============================================================

alter table public.profiles
  add column if not exists username text;

-- اسم المستخدم يكون اختياريًا للحسابات المجهولة القديمة، لكنه فريد عندما يكون موجودًا.
create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is
  'Unique public username for password-based Yoldaş accounts. Passwords are never stored in this table.';

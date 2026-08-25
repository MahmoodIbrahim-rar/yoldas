-- Yoldaş — Progress photos (private by default)
-- Run once in Supabase SQL Editor. This does not publish or share any image.

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capture_date date not null default current_date,
  note text check (char_length(note) <= 280),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

drop policy if exists "Users manage own progress photos" on public.progress_photos;
create policy "Users manage own progress photos"
on public.progress_photos for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_progress_photos_user_date
on public.progress_photos(user_id, capture_date desc, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yoldas-progress-photos',
  'yoldas-progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Progress photo owner uploads" on storage.objects;
drop policy if exists "Progress photo owner reads" on storage.objects;
drop policy if exists "Progress photo owner updates" on storage.objects;
drop policy if exists "Progress photo owner deletes" on storage.objects;

create policy "Progress photo owner uploads"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'yoldas-progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Progress photo owner reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'yoldas-progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Progress photo owner updates"
on storage.objects for update to authenticated
using (
  bucket_id = 'yoldas-progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'yoldas-progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Progress photo owner deletes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'yoldas-progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

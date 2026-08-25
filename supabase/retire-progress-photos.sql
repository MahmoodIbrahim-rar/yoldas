-- ============================================================
-- Yoldaş — تقاعد صور تقدم الجسم وحذفها نهائيًا
-- تحذير: هذا الحذف غير قابل للاسترجاع.
-- شغّل الملف بعد فتح النسخة الجديدة مرة واحدة بحسابك، ثم نفّذ هذا الملف.
-- ============================================================

-- راجع العدد أولًا. يجب أن يظهر 0 بعد أن تفتح الموقع الجديد بحسابك.
select count(*) as remaining_progress_photo_rows from public.progress_photos;

-- عند ظهور 0، نفّذ كتلة الحذف أدناه فقط.
-- delete from storage.objects where bucket_id = 'yoldas-progress-photos';
-- delete from storage.buckets where id = 'yoldas-progress-photos';
-- drop table if exists public.progress_photos;

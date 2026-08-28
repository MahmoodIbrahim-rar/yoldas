-- ============================================================
-- Yoldaş — خصوصية الستريك: المستلم فقط
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- لا يحذف الصور أو السجلات الحالية؛ يقيّد القراءة المباشرة للجدول
-- ويعتمد social-service لإصدار رابط الصورة المؤقت للمستلم فقط.
-- ============================================================

alter table public.streak_snaps enable row level security;
alter table public.snap_reactions enable row level security;

drop policy if exists "streak_snaps_participant_only" on public.streak_snaps;
drop policy if exists "streak_snaps_recipient_only" on public.streak_snaps;
create policy "streak_snaps_recipient_only" on public.streak_snaps
  for select using (auth.uid() = recipient_user_id);

drop policy if exists "snap_reactions_participant_only" on public.snap_reactions;
drop policy if exists "snap_reactions_recipient_only" on public.snap_reactions;
create policy "snap_reactions_recipient_only" on public.snap_reactions
  for select using (
    exists (
      select 1 from public.streak_snaps
      where streak_snaps.id = snap_reactions.snap_id
        and streak_snaps.recipient_user_id = auth.uid()
    )
  );

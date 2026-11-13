-- ════════════════════════════════════════════════════════════════════
-- 0002_storage — Supabase Storage bucket for images / clips / resume
-- (Supabase-only: uses the storage schema.)
--   public  : anyone can read files in the "media" bucket
--   writes  : admin only
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

create policy "public reads media bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy "admin uploads to media bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and private.is_admin());

create policy "admin updates media bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and private.is_admin())
  with check (bucket_id = 'media' and private.is_admin());

create policy "admin deletes from media bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and private.is_admin());

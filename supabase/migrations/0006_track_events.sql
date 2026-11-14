-- ════════════════════════════════════════════════════════════════════
-- 0006_track_events — let visitors record page views and link clicks
--
-- Anonymous visitors may INSERT into events, and nothing else: only for a
-- published project, only 'view' or 'click', with a short target. They can
-- never read events back (admin only). No IP address or user agent is stored.
-- ════════════════════════════════════════════════════════════════════

grant insert on public.events to anon;
grant usage on sequence public.events_id_seq to anon;

create policy "public records views and clicks" on public.events
  for insert to anon
  with check (
    type in ('view', 'click')
    and (target is null or char_length(target) <= 200)
    and project_id is not null
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.published
    )
  );

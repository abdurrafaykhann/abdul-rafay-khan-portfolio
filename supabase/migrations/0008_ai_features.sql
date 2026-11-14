-- ════════════════════════════════════════════════════════════════════
-- 0008_ai_features
--
-- 1. hit_rate_limit(): a sliding-window rate limiter for the AI endpoints
--    (visitor = salted hash, never an IP). Server-only (service role).
-- 2. ask_logs: the questions visitors asked Ask My AI, PII-scrubbed by the
--    server before they are stored. Admin-readable only.
-- 3. matches: stored results of the job-description matcher, reachable by an
--    unguessable id. The job description itself is never stored.
-- ════════════════════════════════════════════════════════════════════

create table private.rate_hits (
  id      bigserial primary key,
  kind    text not null,
  visitor text not null,
  at      timestamptz not null default now()
);
create index rate_hits_lookup_idx on private.rate_hits (kind, visitor, at);

-- true = allowed (and recorded), false = over the limit
create or replace function public.hit_rate_limit(
  p_kind           text,
  p_visitor        text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- housekeeping: forget anything older than a day
  delete from private.rate_hits where at < now() - interval '1 day';

  select count(*) into v_count
  from private.rate_hits
  where kind = p_kind
    and visitor = p_visitor
    and at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    return false;
  end if;

  insert into private.rate_hits (kind, visitor) values (p_kind, p_visitor);
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, text, integer, integer) to service_role;
revoke all on private.rate_hits from anon, authenticated;
grant all on private.rate_hits to service_role;
grant usage, select on sequence private.rate_hits_id_seq to service_role;

-- ── Ask My AI log ──────────────────────────────────────────────────────

create table public.ask_logs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answered   boolean not null default false,   -- false: refused, off-topic or not in the knowledge base
  sources    integer not null default 0,
  model      text,                              -- groq | gemini | none
  created_at timestamptz not null default now()
);
create index ask_logs_created_idx on public.ask_logs (created_at desc);

alter table public.ask_logs enable row level security;
revoke all on public.ask_logs from anon, authenticated;
grant select, delete on public.ask_logs to authenticated;
grant all on public.ask_logs to service_role;
create policy "admin reads" on public.ask_logs for select to authenticated
  using (private.is_admin());
create policy "admin deletes" on public.ask_logs for delete to authenticated
  using (private.is_admin());

-- ── Job-description matches ────────────────────────────────────────────

create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  job_title  text,
  company    text,
  result     jsonb not null,
  created_at timestamptz not null default now()
);
create index matches_created_idx on public.matches (created_at desc);

alter table public.matches enable row level security;
revoke all on public.matches from anon, authenticated;
grant select, delete on public.matches to authenticated;
grant all on public.matches to service_role;
create policy "admin reads" on public.matches for select to authenticated
  using (private.is_admin());
create policy "admin deletes" on public.matches for delete to authenticated
  using (private.is_admin());

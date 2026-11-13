-- ════════════════════════════════════════════════════════════════════
-- 0001_init — content schema, Row Level Security, publish rules
--
-- Access model
--   anon           read-only: published projects (+ their child rows),
--                  categories, types, site content, education.
--                  Never the raw client_name, never private traction rows.
--   authenticated  full access ONLY when the JWT email is the admin email
--                  (private.is_admin()); any other signed-in user gets nothing.
--   service_role   server-side only (bypasses RLS).
-- ════════════════════════════════════════════════════════════════════

create schema if not exists private;

-- Admin email lives here (set by `npm run db:apply` from ADMIN_EMAIL),
-- so it is never committed to the repository.
create table private.config (
  key   text primary key,
  value text not null
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email')
      = (select lower(value) from private.config where key = 'admin_email'),
    false
  );
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Taxonomy (admin-managed, unlimited) ─────────────────────────────

create table public.categories (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  number             text not null default '',
  description        text not null default '',
  stack              text[] not null default '{}',
  color              text not null default '#7621B0',
  show_in_what_i_do  boolean not null default true,
  sort               integer not null default 0,
  created_at         timestamptz not null default now()
);

create table public.project_types (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text not null unique,
  name                      text not null,
  has_client_fields         boolean not null default false,
  has_automation_fields     boolean not null default false,
  has_product_fields        boolean not null default false,
  requires_client_approval  boolean not null default false,
  sort                      integer not null default 0,
  created_at                timestamptz not null default now()
);

-- ── Projects ────────────────────────────────────────────────────────

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  type_id               uuid references public.project_types (id) on delete restrict,
  primary_category_id   uuid references public.categories (id) on delete restrict,
  status                text not null default 'completed'
                          check (status in ('live', 'completed', 'in_progress')),
  show_status_badge     boolean not null default true,
  published             boolean not null default false,
  short_desc            text not null default '',
  case_study_md         text not null default '',
  tech                  text[] not null default '{}',
  links                 jsonb not null default '{}'::jsonb,
  started_on            date,
  ended_on              date,

  -- ordering / placement
  sort                  integer not null default 0,
  is_key                boolean not null default false,
  key_sort              integer not null default 0,
  show_in_marquee       boolean not null default false,
  marquee_sort          integer not null default 0,

  -- card media
  img_left_top          text,
  img_left_bottom       text,
  img_right             text,
  marquee_poster        text,
  marquee_clip          text,

  -- architecture diagram
  architecture_mermaid  text,
  architecture_svg      text,

  -- client work
  client_name           text,
  hide_client_name      boolean not null default false,
  -- what the public may see: null when the name is hidden
  client_display_name   text generated always as (
                          case when hide_client_name then null else client_name end
                        ) stored,
  industry              text,
  my_role               text,
  client_approved       boolean not null default false,
  testimonial           jsonb,

  -- n8n automation
  automation_trigger    text,
  apps                  text[] not null default '{}',
  workflow_screenshot   text,
  savings_text          text,
  workflow_json_path    text,

  -- product (SaaS / GaaS)
  product_name          text,
  product_logo          text,
  value_prop            text,
  product_url           text,
  signup_url            text,
  stage                 text check (stage in ('beta', 'launched')),
  pricing_model         text check (
                          pricing_model in ('free', 'freemium', 'subscription', 'usage_based')
                        ),
  starting_price        text,
  demo_video            text,
  features              text[] not null default '{}',

  -- 3D galaxy position (computed from the embedding on save)
  galaxy_x              real,
  galaxy_y              real,
  galaxy_z              real,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index projects_published_sort_idx on public.projects (published, sort);

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function private.touch_updated_at();

-- A project can only go public when it is complete enough, and client work
-- only once the client has approved showing it.
create or replace function private.enforce_publish_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  needs_approval boolean;
begin
  if not new.published then
    return new;
  end if;

  if new.type_id is null or new.primary_category_id is null then
    raise exception 'A project needs a type and a primary category before it can be published'
      using errcode = 'check_violation';
  end if;

  select t.requires_client_approval into needs_approval
  from public.project_types t
  where t.id = new.type_id;

  if coalesce(needs_approval, false) and not new.client_approved then
    raise exception 'Client approval is required before this project can be published'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger projects_enforce_publish_rules
  before insert or update on public.projects
  for each row execute function private.enforce_publish_rules();

create table public.project_categories (
  project_id   uuid not null references public.projects (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete restrict,
  primary key (project_id, category_id)
);

create table public.project_metrics (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  label       text not null,
  value       text not null,
  highlight   boolean not null default false,
  sort        integer not null default 0
);

create table public.traction_metrics (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  label        text not null,
  value        text not null,
  as_of        date,
  show_public  boolean not null default false,
  sort         integer not null default 0
);

create table public.changelog_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  entry_date  date not null,
  note        text not null
);

create table public.trained_vs_integrated (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  component     text not null,
  kind          text not null check (kind in ('trained', 'integrated')),
  source_model  text not null default '',
  evaluation    text not null default '',
  sort          integer not null default 0
);

create table public.project_media (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  kind        text not null check (kind in ('gallery', 'dashboard')),
  media_type  text not null default 'image' check (media_type in ('image', 'video')),
  url         text not null,
  poster      text,
  alt         text not null default '',
  sort        integer not null default 0
);

create index project_metrics_project_idx       on public.project_metrics (project_id);
create index traction_metrics_project_idx      on public.traction_metrics (project_id);
create index changelog_entries_project_idx     on public.changelog_entries (project_id);
create index trained_vs_integrated_project_idx on public.trained_vs_integrated (project_id);
create index project_media_project_idx         on public.project_media (project_id);

-- ── Site content ────────────────────────────────────────────────────

create table public.site_content (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Education (there is deliberately no work-history table: the site does not
-- list employers). photo_url / certificate_url: a photo of Rafay and of the
-- degree, shown in the Education section.
create table public.education (
  id               uuid primary key default gen_random_uuid(),
  qualification    text not null,
  institution      text not null,
  start_label      text not null default '',
  end_label        text not null default '',
  grade            text not null default '',
  description      text not null default '',
  photo_url        text,
  photo_alt        text not null default '',
  certificate_url  text,
  certificate_alt  text not null default '',
  sort             integer not null default 0
);

-- ── Server-only tables (no public access at all) ────────────────────

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  body        text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at  timestamptz not null default now()
);

-- analytics: no IP address, no user agent
create table public.events (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('view', 'click')),
  project_id  uuid references public.projects (id) on delete cascade,
  target      text,
  created_at  timestamptz not null default now()
);
create index events_project_idx on public.events (project_id, type);

create table public.chat_logs (
  id            bigint generated always as identity primary key,
  question      text not null,          -- scrubbed of emails / phone numbers
  answered      boolean not null,
  source_slugs  text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- the pasted job description itself is never stored
create table public.match_results (
  id          text primary key,
  jd_title    text,
  company     text,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create table public.rate_limits (
  key           text not null,          -- hash of visitor id, never a raw IP
  bucket        text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, bucket, window_start)
);

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════

grant usage on schema private to anon, authenticated, service_role;
revoke all on private.config from anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Every table: RLS on, nothing for anon by default, admin-only for signed-in users.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'project_types', 'projects', 'project_categories',
    'project_metrics', 'traction_metrics', 'changelog_entries',
    'trained_vs_integrated', 'project_media', 'site_content', 'education',
    'messages', 'events', 'chat_logs', 'match_results', 'rate_limits'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated
         using (private.is_admin()) with check (private.is_admin())', t);
  end loop;
end;
$$;

grant usage on all sequences in schema public to authenticated, service_role;

-- ── Public (anon) read access ───────────────────────────────────────

grant select on public.categories, public.project_types, public.site_content,
  public.education, public.project_categories, public.project_metrics,
  public.traction_metrics, public.changelog_entries,
  public.trained_vs_integrated, public.project_media
  to anon;

-- projects: every column EXCEPT the raw client_name
-- (the public reads client_display_name, which is null when hidden).
-- NOTE: a later migration that adds a column must grant it to anon explicitly.
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'projects'
    and column_name <> 'client_name';
  execute format('grant select (%s) on public.projects to anon', cols);
end;
$$;

create policy "public reads categories" on public.categories
  for select to anon using (true);
create policy "public reads project types" on public.project_types
  for select to anon using (true);
create policy "public reads site content" on public.site_content
  for select to anon using (true);
create policy "public reads education" on public.education
  for select to anon using (true);

create policy "public reads published projects" on public.projects
  for select to anon using (published);

-- Child rows are visible only when their project is published. The subquery
-- runs as anon, so the projects policy above applies inside it as well.
create policy "public reads categories of published projects" on public.project_categories
  for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.published));
create policy "public reads metrics of published projects" on public.project_metrics
  for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.published));
create policy "public reads public traction of published projects" on public.traction_metrics
  for select to anon
  using (
    show_public
    and exists (select 1 from public.projects p where p.id = project_id and p.published)
  );
create policy "public reads changelog of published projects" on public.changelog_entries
  for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.published));
create policy "public reads trained-vs-integrated of published projects" on public.trained_vs_integrated
  for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.published));
create policy "public reads media of published projects" on public.project_media
  for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.published));

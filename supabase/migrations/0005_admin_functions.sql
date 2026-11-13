-- ════════════════════════════════════════════════════════════════════
-- 0005_admin_functions — atomic writes for the admin dashboard
--
-- All functions are SECURITY INVOKER: they run as the signed-in caller, so
-- the Row Level Security policies from 0001 still decide who may write
-- (only the admin). They exist so that a project and all of its child rows
-- are saved in one transaction.
-- ════════════════════════════════════════════════════════════════════

-- Save (insert or update) a project with all its child rows. Returns its id.
-- p: one JSON object using the database column names, plus child arrays:
--    category_ids, metrics, traction, changelog, trained_vs_integrated, media
create or replace function public.save_project(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_primary uuid := nullif(p->>'primary_category_id', '')::uuid;
begin
  if v_id is null then
    insert into public.projects (slug, title)
    values (p->>'slug', p->>'title')
    returning id into v_id;
  end if;

  update public.projects set
    slug                 = p->>'slug',
    title                = p->>'title',
    type_id              = nullif(p->>'type_id', '')::uuid,
    primary_category_id  = v_primary,
    status               = coalesce(p->>'status', 'completed'),
    show_status_badge    = coalesce((p->>'show_status_badge')::boolean, true),
    published            = coalesce((p->>'published')::boolean, false),
    short_desc           = coalesce(p->>'short_desc', ''),
    case_study_md        = coalesce(p->>'case_study_md', ''),
    tech                 = coalesce(array(select jsonb_array_elements_text(p->'tech')), '{}'),
    links                = coalesce(p->'links', '{}'::jsonb),
    started_on           = nullif(p->>'started_on', '')::date,
    ended_on             = nullif(p->>'ended_on', '')::date,
    is_key               = coalesce((p->>'is_key')::boolean, false),
    show_in_marquee      = coalesce((p->>'show_in_marquee')::boolean, false),
    img_left_top         = nullif(p->>'img_left_top', ''),
    img_left_bottom      = nullif(p->>'img_left_bottom', ''),
    img_right            = nullif(p->>'img_right', ''),
    marquee_poster       = nullif(p->>'marquee_poster', ''),
    marquee_clip         = nullif(p->>'marquee_clip', ''),
    architecture_mermaid = nullif(p->>'architecture_mermaid', ''),
    client_name          = nullif(p->>'client_name', ''),
    hide_client_name     = coalesce((p->>'hide_client_name')::boolean, false),
    industry             = nullif(p->>'industry', ''),
    my_role              = nullif(p->>'my_role', ''),
    client_approved      = coalesce((p->>'client_approved')::boolean, false),
    testimonial          = case when jsonb_typeof(p->'testimonial') = 'object'
                                then p->'testimonial' end,
    automation_trigger   = nullif(p->>'automation_trigger', ''),
    apps                 = coalesce(array(select jsonb_array_elements_text(p->'apps')), '{}'),
    workflow_screenshot  = nullif(p->>'workflow_screenshot', ''),
    savings_text         = nullif(p->>'savings_text', ''),
    product_name         = nullif(p->>'product_name', ''),
    product_logo         = nullif(p->>'product_logo', ''),
    value_prop           = nullif(p->>'value_prop', ''),
    product_url          = nullif(p->>'product_url', ''),
    signup_url           = nullif(p->>'signup_url', ''),
    stage                = nullif(p->>'stage', ''),
    pricing_model        = nullif(p->>'pricing_model', ''),
    starting_price       = nullif(p->>'starting_price', ''),
    demo_video           = nullif(p->>'demo_video', ''),
    features             = coalesce(array(select jsonb_array_elements_text(p->'features')), '{}')
  where id = v_id;

  if not found then
    raise exception 'Project not found' using errcode = 'no_data_found';
  end if;

  -- categories (the primary category is always one of them)
  delete from public.project_categories where project_id = v_id;
  insert into public.project_categories (project_id, category_id)
  select distinct v_id, c
  from (
    select (jsonb_array_elements_text(coalesce(p->'category_ids', '[]')))::uuid as c
    union
    select v_primary where v_primary is not null
  ) s;

  delete from public.project_metrics where project_id = v_id;
  insert into public.project_metrics (project_id, label, value, highlight, sort)
  select v_id, m->>'label', m->>'value', coalesce((m->>'highlight')::boolean, false), (ord - 1)::int
  from jsonb_array_elements(coalesce(p->'metrics', '[]')) with ordinality as t(m, ord);

  delete from public.traction_metrics where project_id = v_id;
  insert into public.traction_metrics (project_id, label, value, as_of, show_public, sort)
  select v_id, m->>'label', m->>'value', nullif(m->>'as_of', '')::date,
         coalesce((m->>'show_public')::boolean, false), (ord - 1)::int
  from jsonb_array_elements(coalesce(p->'traction', '[]')) with ordinality as t(m, ord);

  delete from public.changelog_entries where project_id = v_id;
  insert into public.changelog_entries (project_id, entry_date, note)
  select v_id, (m->>'entry_date')::date, m->>'note'
  from jsonb_array_elements(coalesce(p->'changelog', '[]')) as t(m);

  delete from public.trained_vs_integrated where project_id = v_id;
  insert into public.trained_vs_integrated
    (project_id, component, kind, source_model, evaluation, sort)
  select v_id, m->>'component', m->>'kind', coalesce(m->>'source_model', ''),
         coalesce(m->>'evaluation', ''), (ord - 1)::int
  from jsonb_array_elements(coalesce(p->'trained_vs_integrated', '[]')) with ordinality as t(m, ord);

  delete from public.project_media where project_id = v_id;
  insert into public.project_media (project_id, kind, media_type, url, poster, alt, sort)
  select v_id, m->>'kind', coalesce(m->>'media_type', 'image'), m->>'url',
         nullif(m->>'poster', ''), coalesce(m->>'alt', ''), (ord - 1)::int
  from jsonb_array_elements(coalesce(p->'media', '[]')) with ordinality as t(m, ord);

  return v_id;
end;
$$;

-- Copy a project and its child rows as an unpublished, non-key draft.
create or replace function public.duplicate_project(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new uuid;
  v_slug text;
  v_n int := 1;
begin
  select slug || '-copy' into v_slug from public.projects where id = p_id;
  if v_slug is null then
    raise exception 'Project not found' using errcode = 'no_data_found';
  end if;
  while exists (select 1 from public.projects where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := regexp_replace(v_slug, '-copy(-\d+)?$', '') || '-copy-' || v_n;
  end loop;

  insert into public.projects (
    slug, title, type_id, primary_category_id, status, show_status_badge,
    published, short_desc, case_study_md, tech, links, started_on, ended_on,
    sort, is_key, key_sort, show_in_marquee, marquee_sort,
    img_left_top, img_left_bottom, img_right, marquee_poster, marquee_clip,
    architecture_mermaid, architecture_svg, client_name, hide_client_name,
    industry, my_role, client_approved, testimonial, automation_trigger, apps,
    workflow_screenshot, savings_text, workflow_json_path, product_name,
    product_logo, value_prop, product_url, signup_url, stage, pricing_model,
    starting_price, demo_video, features)
  select
    v_slug, title || ' (copy)', type_id, primary_category_id, status, show_status_badge,
    false, short_desc, case_study_md, tech, links, started_on, ended_on,
    (select coalesce(max(sort), 0) + 1 from public.projects), false, 0, false, 0,
    img_left_top, img_left_bottom, img_right, marquee_poster, marquee_clip,
    architecture_mermaid, architecture_svg, client_name, hide_client_name,
    industry, my_role, false, testimonial, automation_trigger, apps,
    workflow_screenshot, savings_text, workflow_json_path, product_name,
    product_logo, value_prop, product_url, signup_url, stage, pricing_model,
    starting_price, demo_video, features
  from public.projects where id = p_id
  returning id into v_new;

  insert into public.project_categories (project_id, category_id)
    select v_new, category_id from public.project_categories where project_id = p_id;
  insert into public.project_metrics (project_id, label, value, highlight, sort)
    select v_new, label, value, highlight, sort from public.project_metrics where project_id = p_id;
  insert into public.traction_metrics (project_id, label, value, as_of, show_public, sort)
    select v_new, label, value, as_of, show_public, sort from public.traction_metrics where project_id = p_id;
  insert into public.changelog_entries (project_id, entry_date, note)
    select v_new, entry_date, note from public.changelog_entries where project_id = p_id;
  insert into public.trained_vs_integrated (project_id, component, kind, source_model, evaluation, sort)
    select v_new, component, kind, source_model, evaluation, sort
    from public.trained_vs_integrated where project_id = p_id;
  insert into public.project_media (project_id, kind, media_type, url, poster, alt, sort)
    select v_new, kind, media_type, url, poster, alt, sort from public.project_media where project_id = p_id;

  return v_new;
end;
$$;

-- Store a new order. p_ids lists the rows in their new order.
-- p_list: 'projects' | 'key' | 'marquee' | 'categories' | 'types'
create or replace function public.reorder(p_list text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  case p_list
    when 'projects' then
      update public.projects t set sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    when 'key' then
      update public.projects t set key_sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    when 'marquee' then
      update public.projects t set marquee_sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    when 'categories' then
      update public.categories t set sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    when 'types' then
      update public.project_types t set sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    else
      raise exception 'Unknown list %', p_list using errcode = 'invalid_parameter_value';
  end case;
end;
$$;

revoke all on function public.save_project(jsonb) from public, anon;
revoke all on function public.duplicate_project(uuid) from public, anon;
revoke all on function public.reorder(text, uuid[]) from public, anon;
grant execute on function public.save_project(jsonb) to authenticated, service_role;
grant execute on function public.duplicate_project(uuid) to authenticated, service_role;
grant execute on function public.reorder(text, uuid[]) to authenticated, service_role;

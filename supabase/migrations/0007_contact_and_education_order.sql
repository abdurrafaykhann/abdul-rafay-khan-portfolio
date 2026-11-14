-- ════════════════════════════════════════════════════════════════════
-- 0007_contact_and_education_order
--
-- 1. The contact form: visitors call submit_message(), which validates the
--    text and rate-limits per visitor (a salted hash, never an IP) and
--    globally, then stores the message. Visitors can never read messages.
-- 2. reorder() also orders the education entries.
-- ════════════════════════════════════════════════════════════════════

alter table public.messages add column visitor_hash text;
create index messages_visitor_idx on public.messages (visitor_hash, created_at);

create or replace function public.submit_message(
  p_name    text,
  p_email   text,
  p_body    text,
  p_visitor text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_total  integer;
begin
  if char_length(trim(coalesce(p_name, '')))  not between 1 and 100
     or char_length(trim(coalesce(p_email, ''))) not between 3 and 254
     or position('@' in coalesce(p_email, '')) < 2
     or char_length(trim(coalesce(p_body, '')))  not between 5 and 4000 then
    return 'invalid';
  end if;

  select count(*) into v_recent
  from public.messages
  where visitor_hash = p_visitor and created_at > now() - interval '1 hour';
  if v_recent >= 3 then
    return 'rate_limited';
  end if;

  select count(*) into v_total
  from public.messages
  where created_at > now() - interval '1 hour';
  if v_total >= 60 then
    return 'rate_limited';
  end if;

  insert into public.messages (name, email, body, visitor_hash)
  values (trim(p_name), trim(p_email), trim(p_body), p_visitor);
  return 'ok';
end;
$$;

revoke all on function public.submit_message(text, text, text, text) from public;
grant execute on function public.submit_message(text, text, text, text)
  to anon, authenticated, service_role;

-- reorder(): add the education list
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
    when 'education' then
      update public.education t set sort = o.ord - 1
      from unnest(p_ids) with ordinality as o(id, ord) where t.id = o.id;
    else
      raise exception 'Unknown list %', p_list using errcode = 'invalid_parameter_value';
  end case;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- Seed: default project types and categories, plus three UNPUBLISHED
-- drafts to review in the admin. Safe to run more than once.
-- Nothing here is invented: fields without a known value are left empty
-- (empty fields are hidden on the public site).
-- ════════════════════════════════════════════════════════════════════

insert into public.project_types
  (slug, name, has_client_fields, has_automation_fields, has_product_fields, requires_client_approval, sort)
values
  ('client',             'Client',             true,  false, false, true,  1),
  ('personal',           'Personal',           false, false, false, false, 2),
  ('final-year-project', 'Final-year project', false, false, false, false, 3),
  ('saas-product',       'SaaS product',       false, false, true,  false, 4),
  ('gaas-product',       'GaaS product',       false, false, true,  false, 5)
on conflict (slug) do nothing;

-- Descriptions and stacks are left empty for the admin to fill in.
insert into public.categories (slug, name, number, color, sort)
values
  ('ai-automations',        'AI Automations',                  '01', '#B600A8', 1),
  ('agentic-ai',            'Agentic AI',                      '02', '#7621B0', 2),
  ('websites-client-work',  'Websites & Client Work',          '03', '#BE4C00', 3),
  ('computer-vision',       'Computer Vision',                 '04', '#2F80ED', 4),
  ('ml-data-science',       'Machine Learning & Data Science', '05', '#27AE60', 5),
  ('3d-webgl',              '3D & WebGL',                      '06', '#D7E2EA', 6)
on conflict (slug) do nothing;

insert into public.site_content (key, value)
values (
  'hero_tagline',
  to_jsonb('an AI engineer building automations, AI products and websites that work'::text)
)
on conflict (key) do nothing;

-- ── Draft 1: Sentinel ───────────────────────────────────────────────
insert into public.projects
  (slug, title, type_id, primary_category_id, status, published, short_desc, my_role, sort)
select
  'sentinel',
  'Sentinel',
  (select id from public.project_types where slug = 'final-year-project'),
  (select id from public.categories where slug = 'computer-vision'),
  'completed',
  false,
  'AI surveillance console. My final-year project, built solo.',
  'Solo developer',
  1
where not exists (select 1 from public.projects where slug = 'sentinel');

insert into public.project_categories (project_id, category_id)
select p.id, c.id
from public.projects p
join public.categories c on c.slug in ('computer-vision', 'ml-data-science')
where p.slug = 'sentinel'
on conflict do nothing;

insert into public.trained_vs_integrated
  (project_id, component, kind, source_model, evaluation, sort)
select p.id, v.component, v.kind, v.source_model, v.evaluation, v.sort
from public.projects p
cross join (values
  ('Violence classifier', 'trained',
   'Trained by me on RWF-2000',
   '79% recall / 81% precision on 400 held-out clips', 1),
  ('Face identification', 'integrated',
   'Pretrained YuNet + SFace, integrated and evaluated by me',
   '97.7% top-1 on a 54-person held-out test', 2),
  ('Weapon detector', 'integrated',
   'Pretrained community model, integrated and evaluated by me',
   '', 3)
) as v (component, kind, source_model, evaluation, sort)
where p.slug = 'sentinel'
  and not exists (
    select 1 from public.trained_vs_integrated t where t.project_id = p.id
  );

insert into public.project_metrics (project_id, label, value, highlight, sort)
select p.id, v.label, v.value, v.highlight, v.sort
from public.projects p
cross join (values
  ('Violence recall (400 held-out clips)',    '79%',   true,  1),
  ('Violence precision (400 held-out clips)', '81%',   false, 2),
  ('Face ID top-1 (54-person held-out test)', '97.7%', true,  3)
) as v (label, value, highlight, sort)
where p.slug = 'sentinel'
  and not exists (
    select 1 from public.project_metrics m where m.project_id = p.id
  );

-- ── Draft 2: Sweet Crumbs WhatsApp Agent ────────────────────────────
-- Type, client details and metrics are intentionally empty.
insert into public.projects
  (slug, title, primary_category_id, status, published, sort)
select
  'sweet-crumbs-whatsapp-agent',
  'Sweet Crumbs WhatsApp Agent',
  (select id from public.categories where slug = 'ai-automations'),
  'live',
  false,
  2
where not exists (
  select 1 from public.projects where slug = 'sweet-crumbs-whatsapp-agent'
);

insert into public.project_categories (project_id, category_id)
select p.id, c.id
from public.projects p
join public.categories c on c.slug in ('ai-automations', 'agentic-ai')
where p.slug = 'sweet-crumbs-whatsapp-agent'
on conflict do nothing;

-- ── Draft 3: DocSense ───────────────────────────────────────────────
-- Type and metrics are intentionally empty.
insert into public.projects
  (slug, title, primary_category_id, status, published, sort)
select
  'docsense',
  'DocSense',
  (select id from public.categories where slug = 'agentic-ai'),
  'in_progress',
  false,
  3
where not exists (select 1 from public.projects where slug = 'docsense');

insert into public.project_categories (project_id, category_id)
select p.id, c.id
from public.projects p
join public.categories c on c.slug = 'agentic-ai'
where p.slug = 'docsense'
on conflict do nothing;

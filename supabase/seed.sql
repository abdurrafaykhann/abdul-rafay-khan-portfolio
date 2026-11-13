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

-- Descriptions and stacks are drafted from Rafay's CV (editable in the admin).
insert into public.categories (slug, name, number, description, stack, color, sort)
values
  ('ai-automations', 'AI Automations', '01',
   'n8n workflows that connect your apps, automate repetitive work and bring AI into day-to-day operations.',
   array['n8n', 'AI integrations', 'REST APIs'], '#B600A8', 1),
  ('agentic-ai', 'Agentic AI', '02',
   'AI agents built with LangChain that answer questions, use tools and carry out multi-step tasks.',
   array['LangChain', 'Python', 'Node.js'], '#7621B0', 2),
  ('websites-client-work', 'Websites & Client Work', '03',
   'Websites and full-stack applications, from interface and API to database, built around what the business actually needs.',
   array['React', 'Node.js', 'Django', 'SQL'], '#BE4C00', 3),
  ('computer-vision', 'Computer Vision', '04',
   'Vision pipelines that are trained, integrated and evaluated against held-out data.',
   array['Python'], '#2F80ED', 4),
  ('ml-data-science', 'Machine Learning & Data Science', '05',
   'Model training, data preprocessing and evaluation, reported with honest held-out metrics.',
   array['Python', 'SQL', 'Business analytics'], '#27AE60', 5),
  ('3d-webgl', '3D & WebGL', '06',
   'Interactive 3D web experiences and animations with Three.js and WebGL.',
   array['Three.js', 'WebGL', 'React'], '#D7E2EA', 6)
on conflict (slug) do nothing;

insert into public.site_content (key, value)
values
  ('hero_tagline',
   to_jsonb('an AI engineer building automations, AI products and websites that work'::text)),
  -- No employer names, on purpose.
  ('about_text',
   to_jsonb('I''m a Computer Science graduate (CGPA 3.9) and a full-stack developer and AI engineer. I build AI agents, n8n automations, full-stack web apps and interactive 3D websites. I''ve built business management software and worked on a banking risk-management system, and today I run my own technology agency and freelance for clients. My approach is business-first: understand the problem, choose the right technology, and ship something that is easy to maintain.'::text)),
  ('skills', '[
    {"group": "AI & Automation", "items": ["Agentic AI", "LangChain", "AI agents", "n8n workflow automation", "AI integrations"]},
    {"group": "Frontend", "items": ["JavaScript", "React", "HTML", "CSS", "Three.js", "WebGL", "Responsive web design", "UX"]},
    {"group": "Backend & APIs", "items": ["Python", "Node.js", "Django", "REST APIs", "Integrations"]},
    {"group": "Databases", "items": ["SQL", "Database design", "Data modelling"]},
    {"group": "Engineering", "items": ["Full-stack development", "SaaS development", "Software testing", "Security fundamentals", "Debugging"]},
    {"group": "Additional", "items": ["Business analytics", "Product thinking", "Technical planning", "Client communication"]}
  ]'::jsonb),
  ('socials', '{"linkedin": "https://www.linkedin.com/in/abdul-rafay-8438b9430/"}'::jsonb)
on conflict (key) do nothing;

-- Education (from the CV). photo_url / certificate_url are added in the admin.
insert into public.education
  (qualification, institution, start_label, end_label, grade, sort)
select v.qualification, v.institution, v.start_label, v.end_label, v.grade, v.sort
from (values
  ('BSc Computer Science',            'University of Hertfordshire', 'Feb 2023', 'Jan 2026', 'CGPA 3.9', 1),
  ('Intermediate (Pre-Engineering)',  'DA Degree College',           'Feb 2020', 'Feb 2023', 'Grade A',  2),
  ('O Levels',                        'Beaconhouse',                 'Mar 2006', 'Jun 2019', 'Grade A',  3)
) as v (qualification, institution, start_label, end_label, grade, sort)
where not exists (select 1 from public.education);

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

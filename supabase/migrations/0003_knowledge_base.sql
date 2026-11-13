-- ════════════════════════════════════════════════════════════════════
-- 0003_knowledge_base — pgvector store for Ask My AI / the JD matcher
-- Server-only: read and written with the service role, never by anon.
-- Embedding size is 768 (EMBEDDING_DIM); changing it needs a new migration.
-- ════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table public.kb_chunks (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null,   -- project | category | about | skills | education | resume
  source_id    text not null,   -- project id, or a fixed key for site content
  source_url   text,            -- page the answer links to
  title        text not null default '',
  content      text not null,
  hash         text not null,   -- content hash: unchanged chunks are not re-embedded
  embedding    extensions.vector(768) not null,
  created_at   timestamptz not null default now(),
  unique (source_type, source_id, hash)
);

create index kb_chunks_source_idx on public.kb_chunks (source_type, source_id);
create index kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.kb_chunks enable row level security;
revoke all on public.kb_chunks from anon, authenticated;
grant select, insert, update, delete on public.kb_chunks to authenticated;
grant all on public.kb_chunks to service_role;
create policy "admin full access" on public.kb_chunks for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Nearest chunks by cosine similarity (1 = identical).
create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  match_count     integer default 6,
  min_similarity  double precision default 0
)
returns table (
  id           uuid,
  source_type  text,
  source_id    text,
  source_url   text,
  title        text,
  content      text,
  similarity   double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select c.id, c.source_type, c.source_id, c.source_url, c.title, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;

revoke all on function public.match_chunks(extensions.vector, integer, double precision)
  from public, anon, authenticated;
grant execute on function public.match_chunks(extensions.vector, integer, double precision)
  to service_role;

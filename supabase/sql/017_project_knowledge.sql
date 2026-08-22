-- Abapfy — base de conhecimento por projeto com busca híbrida

create extension if not exists vector with schema extensions;

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'documentacao' check (category in (
    'funcional', 'tecnica', 'convencoes_abap', 'catalogo_z', 'modelo',
    'manual', 'arquitetura', 'cliente', 'documentacao'
  )),
  version text not null default '1.0',
  mime_type text,
  size_bytes bigint not null default 0,
  indexing_mode text not null default 'lexical' check (indexing_mode in ('semantic', 'lexical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists project_documents_set_updated_at on public.project_documents;
create trigger project_documents_set_updated_at
  before update on public.project_documents
  for each row execute function public.set_updated_at();

create index if not exists project_documents_project_idx
  on public.project_documents (project_id, updated_at desc);

create table if not exists public.project_document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.project_documents (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists project_document_chunks_project_idx
  on public.project_document_chunks (project_id, document_id, chunk_index);

create index if not exists project_document_chunks_fts_idx
  on public.project_document_chunks using gin (to_tsvector('simple', content));

create index if not exists project_document_chunks_embedding_idx
  on public.project_document_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_project_knowledge(
  p_project_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 6
)
returns table (
  document_id uuid,
  document_name text,
  category text,
  version text,
  updated_at timestamptz,
  excerpt text,
  confidence double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select d.id, d.name, d.category, d.version, d.updated_at, c.content,
         greatest(0::double precision, 1 - (c.embedding <=> p_query_embedding)) as confidence
  from public.project_document_chunks c
  join public.project_documents d on d.id = c.document_id
  where c.project_id = p_project_id
    and c.user_id = auth.uid()
    and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

create or replace function public.search_project_knowledge_text(
  p_project_id uuid,
  p_query text,
  p_match_count integer default 6
)
returns table (
  document_id uuid,
  document_name text,
  category text,
  version text,
  updated_at timestamptz,
  excerpt text,
  confidence double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select d.id, d.name, d.category, d.version, d.updated_at, c.content,
      token_match.matches as rank
    from public.project_document_chunks c
    join public.project_documents d on d.id = c.document_id
    cross join lateral (
      select count(*)::double precision as matches
      from regexp_split_to_table(lower(p_query), '\s+') token
      where char_length(token) >= 3 and lower(c.content) like '%' || token || '%'
    ) token_match
    where c.project_id = p_project_id
      and c.user_id = auth.uid()
      and token_match.matches > 0
  )
  select id, name, category, version, updated_at, content,
         least(0.79::double precision, 0.34::double precision + rank * 0.07)
  from ranked
  order by rank desc, updated_at desc
  limit least(greatest(p_match_count, 1), 12);
$$;

grant execute on function public.match_project_knowledge(uuid, extensions.vector, integer) to authenticated;
grant execute on function public.search_project_knowledge_text(uuid, text, integer) to authenticated;

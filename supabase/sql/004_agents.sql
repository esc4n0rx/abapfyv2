-- Abapfy — Harness de agentes
--
-- default_agents: catálogo global de agentes SAP/ABAP, gerido via seed SQL
-- (ver 006_default_agents_seed.sql). Somente leitura para usuários — nunca
-- podem ser excluídos ou alterados pelo cliente (ver RLS em 004_agents_rls.sql).
--
-- user_agents: agentes customizados importados/criados por cada usuário
-- (nome + descrição + conteúdo .md), usados no roteamento junto do catálogo
-- padrão.

create table if not exists public.default_agents (
  id text primary key,
  name text not null,
  description text not null,
  content text not null,
  flow_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.default_agents is 'Catálogo global de agentes do harness — somente leitura para usuários, gerido via seed SQL.';

drop trigger if exists default_agents_set_updated_at on public.default_agents;
create trigger default_agents_set_updated_at
  before update on public.default_agents
  for each row
  execute function public.set_updated_at();

create table if not exists public.user_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

comment on table public.user_agents is 'Agentes customizados importados/criados por usuário (nome, descrição, conteúdo .md).';

drop trigger if exists user_agents_set_updated_at on public.user_agents;
create trigger user_agents_set_updated_at
  before update on public.user_agents
  for each row
  execute function public.set_updated_at();

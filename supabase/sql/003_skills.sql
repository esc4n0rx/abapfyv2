-- Abapfy — skills do usuário (built-in ativadas/desativadas + skills importadas)
--
-- As skills built-in (ver src/renderer/src/lib/skillsCatalog.ts) vivem como conteúdo
-- estático no app; esta tabela só guarda, por usuário, o estado de ativação delas e o
-- conteúdo completo das skills importadas manualmente. Ainda não conectado ao modelo —
-- só gerencia o catálogo (ativar/desativar/importar).

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  category text,
  is_builtin boolean not null default false,
  content_md text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

comment on table public.user_skills is 'Estado (ativa/inativa) das skills built-in por usuário + skills .md importadas manualmente.';

drop trigger if exists user_skills_set_updated_at on public.user_skills;
create trigger user_skills_set_updated_at
  before update on public.user_skills
  for each row
  execute function public.set_updated_at();

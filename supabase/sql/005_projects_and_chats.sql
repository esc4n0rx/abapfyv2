-- Abapfy — Projetos, chats e mensagens
--
-- Um projeto agrupa chats sob um nome/descrição/contexto e (opcionalmente) um
-- agente padrão — quando definido, novos chats do projeto pulam o roteador
-- (Haiku) e ativam esse agente direto. Chats fora de projeto ficam com
-- project_id nulo. Mensagens são persistidas por chat para permitir retomar
-- a conversa reenviando o histórico completo ao modelo.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  context text,
  default_agent_source text check (default_agent_source in ('default', 'custom')),
  default_agent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'Agrupamento de chats com contexto e agente padrão opcional.';

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default 'Nova conversa',
  agent_source text check (agent_source in ('default', 'custom')),
  agent_id text,
  agent_name text,
  system_prompt text,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chats is 'Uma conversa. agent_* e system_prompt são um snapshot do agente ativado (pelo roteador Haiku ou pelo padrão do projeto) no momento da ativação.';

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at
  before update on public.chats
  for each row
  execute function public.set_updated_at();

create index if not exists chats_user_updated_idx on public.chats (user_id, updated_at desc);
create index if not exists chats_project_idx on public.chats (project_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_input integer,
  tokens_output integer,
  response_ms integer,
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is 'Mensagens de um chat, com métricas de tokens/tempo de resposta (turnos do assistente).';

create index if not exists chat_messages_chat_idx on public.chat_messages (chat_id, created_at);

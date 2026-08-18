-- Abapfy — configuração MCP persistida por usuário e associação N:N com agentes.
-- Credenciais, headers secretos e variáveis de ambiente não são armazenados aqui.

create table if not exists public.mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  transport text not null check (transport in ('streamable_http', 'stdio')),
  url text,
  command text,
  args jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  constraint mcp_servers_transport_config_check check (
    (transport = 'streamable_http' and url is not null and command is null)
    or (transport = 'stdio' and command is not null and url is null)
  ),
  constraint mcp_servers_args_array_check check (jsonb_typeof(args) = 'array')
);

comment on table public.mcp_servers is
  'Servidores MCP por usuário. Não armazena credenciais; perfis SAP permanecem no computador local.';

drop trigger if exists mcp_servers_set_updated_at on public.mcp_servers;
create trigger mcp_servers_set_updated_at
  before update on public.mcp_servers
  for each row
  execute function public.set_updated_at();

create table if not exists public.mcp_agent_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  server_id uuid not null references public.mcp_servers (id) on delete cascade,
  agent_source text not null check (agent_source in ('default', 'custom')),
  agent_id text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, server_id, agent_source, agent_id)
);

comment on table public.mcp_agent_bindings is
  'Associação N:N entre servidores MCP e agentes padrão ou customizados.';

drop trigger if exists mcp_agent_bindings_set_updated_at on public.mcp_agent_bindings;
create trigger mcp_agent_bindings_set_updated_at
  before update on public.mcp_agent_bindings
  for each row
  execute function public.set_updated_at();

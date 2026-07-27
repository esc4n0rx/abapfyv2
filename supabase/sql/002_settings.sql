-- Abapfy — preferências do usuário e chaves de API de IA

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'linear-dark',
  default_ai_provider text,
  default_ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_check
    check (theme in ('linear-dark', 'emerald-dark', 'amber-dark', 'crimson-dark')),
  constraint user_settings_default_provider_check
    check (default_ai_provider is null or default_ai_provider in ('openai', 'gemini', 'claude'))
);

comment on table public.user_settings is 'Preferências de UI (tema) e provedor/modelo de IA padrão por usuário.';

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

-- Chaves de API dos provedores de IA suportados (OpenAI, Gemini, Claude).
-- Uma linha por (usuário, provedor); reenviar a chave faz upsert.
create table if not exists public.ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'gemini', 'claude')),
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

comment on table public.ai_api_keys is 'Chaves de API por usuário e provedor de IA. Texto em claro: ver nota de segurança no README do Supabase antes de ir para produção.';

drop trigger if exists ai_api_keys_set_updated_at on public.ai_api_keys;
create trigger ai_api_keys_set_updated_at
  before update on public.ai_api_keys
  for each row
  execute function public.set_updated_at();

-- Abapfy — Parâmetros de estimativa de esforço
--
-- estimativa_parametros: horas-base por combinação tipo × objeto × complexidade
-- (ex.: RFC / Novo / Media → analise_ef=2h, espec=4h, codific=22h, testes=4h),
-- usada pelo agente "Estimador de Esforço ABAP" (ver 006_default_agents_seed.sql)
-- como fonte única de horas por objeto identificado.
--
-- cliente_parametros: fator multiplicador de produtividade por cliente/empresa,
-- por fase do projeto (levantamento, especificação, codificação, testes, BPP,
-- homologação, go-live, documentação, gerência etc.). Um valor 0.00 indica que
-- aquela fase não é praticada/cobrada para esse cliente (não é "zero horas").
--
-- Ambas são tabelas por usuário (cada usuário mantém e edita a própria cópia em
-- Configurações → Parâmetros) e são semeadas automaticamente com os valores de
-- referência (cliente_parametros_rows.sql / estimativa_parametros_rows.sql) para
-- cada novo usuário, para que o agente sempre tenha dados para consultar.

create table if not exists public.estimativa_parametros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  objeto text not null,
  complexidade text not null,
  analise_ef numeric(6, 2) not null default 0,
  espec numeric(6, 2) not null default 0,
  codific numeric(6, 2) not null default 0,
  testes numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tipo, objeto, complexidade)
);

comment on table public.estimativa_parametros is 'Horas-base por tipo/objeto/complexidade, editável por usuário, consultada pelo agente Estimador de Esforço ABAP.';

drop trigger if exists estimativa_parametros_set_updated_at on public.estimativa_parametros;
create trigger estimativa_parametros_set_updated_at
  before update on public.estimativa_parametros
  for each row
  execute function public.set_updated_at();

create table if not exists public.cliente_parametros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  empresa text not null,
  levantamento numeric(6, 2) not null default 1,
  impl_proposal numeric(6, 2) not null default 0,
  esp_func numeric(6, 2) not null default 1,
  esp_tec numeric(6, 2) not null default 1,
  codific numeric(6, 2) not null default 1,
  traducao_en numeric(6, 2) not null default 0,
  traducao_es numeric(6, 2) not null default 0,
  teste_unitario numeric(6, 2) not null default 1,
  teste_qas numeric(6, 2) not null default 1,
  bpp_pt numeric(6, 2) not null default 0,
  bpp_en numeric(6, 2) not null default 0,
  bpp_es numeric(6, 2) not null default 0,
  teste_volume numeric(6, 2) not null default 0,
  homologacao numeric(6, 2) not null default 0,
  access_control numeric(6, 2) not null default 1,
  homologacao_2 numeric(6, 2) not null default 1,
  go_live numeric(6, 2) not null default 1,
  documentacao numeric(6, 2) not null default 1,
  gerencia numeric(6, 2) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, empresa)
);

comment on table public.cliente_parametros is 'Fator multiplicador de produtividade por cliente/empresa e fase do projeto, editável por usuário, consultado pelo agente Estimador de Esforço ABAP.';

drop trigger if exists cliente_parametros_set_updated_at on public.cliente_parametros;
create trigger cliente_parametros_set_updated_at
  before update on public.cliente_parametros
  for each row
  execute function public.set_updated_at();

-- Semeia as duas tabelas com os valores de referência para um usuário (idempotente
-- via on conflict do nothing — nunca sobrescreve edições já feitas pelo usuário).
create or replace function public.seed_default_parametros(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.estimativa_parametros
    (user_id, tipo, objeto, complexidade, analise_ef, espec, codific, testes)
  values
    (p_user_id, 'Outbound', 'Alteração', 'Muito Baixa', 1, 1, 8, 2),
    (p_user_id, 'RFC', 'Alteração', 'Muito Baixa', 1, 1, 3, 1),
    (p_user_id, 'RFC', 'Novo', 'Media', 2, 4, 22, 4),
    (p_user_id, 'On-Line', 'Alteração', 'Baixa', 1, 1, 12, 2),
    (p_user_id, 'Ampliação', 'Alteração', 'Media', 2, 2, 24, 4),
    (p_user_id, 'Workflow', 'Alteração', 'Alta', 8, 8, 32, 8),
    (p_user_id, 'RFC', 'Novo', 'Muito Baixa', 1, 1, 4, 2),
    (p_user_id, 'Tabela', 'Novo', 'Media', 0, 0, 8, 4),
    (p_user_id, 'Formulário', 'Novo', 'Baixa', 2, 2, 26, 2),
    (p_user_id, 'Ampliação', 'Novo', 'Baixa', 2, 2, 16, 4),
    (p_user_id, 'RFC', 'Alteração', 'Alta', 2, 4, 24, 4),
    (p_user_id, 'Inbound', 'Novo', 'Muito Alta', 8, 16, 80, 16),
    (p_user_id, 'Relatórios', 'Novo', 'Baixa', 1, 3, 8, 4),
    (p_user_id, 'Ampliação', 'Novo', 'Muito Alta', 8, 8, 56, 16),
    (p_user_id, 'Inbound', 'Alteração', 'Baixa', 1, 1, 12, 2),
    (p_user_id, 'Tabela', 'Novo', 'Alta', 0, 0, 16, 4),
    (p_user_id, 'Formulário', 'Alteração', 'Alta', 6, 4, 32, 4),
    (p_user_id, 'RFC', 'Alteração', 'Muito Alta', 4, 6, 32, 6),
    (p_user_id, 'Tabela', 'Novo', 'Muito Alta', 0, 0, 24, 4),
    (p_user_id, 'Workflow', 'Alteração', 'Muito Alta', 12, 8, 48, 8),
    (p_user_id, 'On-Line', 'Alteração', 'Alta', 4, 4, 40, 6),
    (p_user_id, 'Workflow', 'Novo', 'Baixa', 1, 1, 20, 2),
    (p_user_id, 'Relatórios', 'Novo', 'Media', 2, 8, 24, 6),
    (p_user_id, 'Workflow', 'Alteração', 'Baixa', 1, 1, 8, 2),
    (p_user_id, 'RFC', 'Novo', 'Alta', 4, 8, 32, 4),
    (p_user_id, 'Tabela', 'Alteração', 'Alta', 0, 0, 8, 4),
    (p_user_id, 'Workflow', 'Novo', 'Alta', 6, 6, 60, 8),
    (p_user_id, 'On-Line', 'Alteração', 'Muito Baixa', 1, 1, 4, 2),
    (p_user_id, 'On-Line', 'Novo', 'Baixa', 2, 2, 16, 4),
    (p_user_id, 'Workflow', 'Alteração', 'Media', 4, 4, 16, 4),
    (p_user_id, 'Formulário', 'Novo', 'Media', 4, 6, 42, 6),
    (p_user_id, 'On-Line', 'Alteração', 'Media', 2, 2, 24, 4),
    (p_user_id, 'Inbound', 'Alteração', 'Media', 2, 2, 24, 4),
    (p_user_id, 'Inbound', 'Alteração', 'Muito Baixa', 1, 1, 4, 2),
    (p_user_id, 'Relatórios', 'Novo', 'Alta', 4, 16, 32, 8),
    (p_user_id, 'Outbound', 'Alteração', 'Alta', 4, 6, 32, 12),
    (p_user_id, 'Formulário', 'Alteração', 'Muito Alta', 8, 6, 44, 8),
    (p_user_id, 'Tabela', 'Novo', 'Muito Baixa', 0, 0, 2, 2),
    (p_user_id, 'Outbound', 'Novo', 'Baixa', 2, 2, 16, 4),
    (p_user_id, 'Inbound', 'Alteração', 'Alta', 4, 4, 40, 6),
    (p_user_id, 'Outbound', 'Novo', 'Muito Baixa', 1, 1, 12, 2),
    (p_user_id, 'Relatórios', 'Alteração', 'Muito Baixa', 1, 1, 1, 1),
    (p_user_id, 'Workflow', 'Novo', 'Muito Alta', 8, 8, 88, 16),
    (p_user_id, 'Outbound', 'Alteração', 'Muito Alta', 6, 8, 64, 16),
    (p_user_id, 'Tabela', 'Alteração', 'Muito Baixa', 0, 0, 1, 1),
    (p_user_id, 'RFC', 'Alteração', 'Media', 2, 2, 14, 2),
    (p_user_id, 'On-Line', 'Novo', 'Muito Baixa', 2, 2, 10, 2),
    (p_user_id, 'Relatórios', 'Alteração', 'Alta', 4, 4, 20, 4),
    (p_user_id, 'Ampliação', 'Alteração', 'Muito Alta', 6, 6, 40, 12),
    (p_user_id, 'Formulário', 'Novo', 'Muito Alta', 8, 16, 86, 10),
    (p_user_id, 'Outbound', 'Novo', 'Muito Alta', 8, 8, 88, 16),
    (p_user_id, 'Tabela', 'Novo', 'Baixa', 0, 0, 4, 2),
    (p_user_id, 'Inbound', 'Novo', 'Baixa', 2, 2, 16, 4),
    (p_user_id, 'Workflow', 'Novo', 'Muito Baixa', 1, 1, 8, 2),
    (p_user_id, 'RFC', 'Alteração', 'Baixa', 1, 1, 6, 2),
    (p_user_id, 'Outbound', 'Alteração', 'Baixa', 1, 2, 12, 4),
    (p_user_id, 'Workflow', 'Novo', 'Media', 2, 4, 30, 4),
    (p_user_id, 'Ampliação', 'Alteração', 'Baixa', 1, 1, 12, 2),
    (p_user_id, 'Inbound', 'Novo', 'Alta', 6, 8, 54, 12),
    (p_user_id, 'Formulário', 'Alteração', 'Baixa', 2, 1, 16, 2),
    (p_user_id, 'Tabela', 'Alteração', 'Muito Alta', 0, 0, 16, 4),
    (p_user_id, 'RFC', 'Novo', 'Muito Alta', 6, 8, 42, 8),
    (p_user_id, 'Outbound', 'Novo', 'Alta', 4, 6, 64, 12),
    (p_user_id, 'Tabela', 'Alteração', 'Media', 0, 0, 4, 4),
    (p_user_id, 'On-Line', 'Novo', 'Alta', 6, 8, 54, 12),
    (p_user_id, 'Inbound', 'Novo', 'Muito Baixa', 2, 2, 10, 2),
    (p_user_id, 'Relatórios', 'Alteração', 'Media', 2, 2, 8, 4),
    (p_user_id, 'Relatórios', 'Alteração', 'Baixa', 1, 1, 4, 2),
    (p_user_id, 'Ampliação', 'Novo', 'Media', 4, 4, 32, 8),
    (p_user_id, 'Ampliação', 'Novo', 'Alta', 6, 6, 40, 12),
    (p_user_id, 'On-Line', 'Novo', 'Media', 4, 4, 24, 8),
    (p_user_id, 'Formulário', 'Novo', 'Alta', 6, 8, 68, 8),
    (p_user_id, 'Relatórios', 'Novo', 'Muito Alta', 8, 24, 48, 10),
    (p_user_id, 'RFC', 'Novo', 'Baixa', 1, 3, 8, 4),
    (p_user_id, 'Relatórios', 'Novo', 'Muito Baixa', 1, 1, 4, 2),
    (p_user_id, 'Tabela', 'Alteração', 'Baixa', 0, 0, 3, 1),
    (p_user_id, 'Inbound', 'Novo', 'Media', 4, 4, 24, 8),
    (p_user_id, 'Formulário', 'Novo', 'Muito Baixa', 1, 1, 12, 2),
    (p_user_id, 'Outbound', 'Novo', 'Media', 2, 4, 32, 8),
    (p_user_id, 'Formulário', 'Alteração', 'Media', 4, 2, 24, 4),
    (p_user_id, 'Inbound', 'Alteração', 'Muito Alta', 6, 8, 58, 8),
    (p_user_id, 'Workflow', 'Alteração', 'Muito Baixa', 1, 1, 2, 2),
    (p_user_id, 'Ampliação', 'Novo', 'Muito Baixa', 1, 1, 12, 2),
    (p_user_id, 'Relatórios', 'Alteração', 'Muito Alta', 6, 6, 30, 6),
    (p_user_id, 'Ampliação', 'Alteração', 'Muito Baixa', 1, 1, 5, 1),
    (p_user_id, 'Ampliação', 'Alteração', 'Alta', 4, 4, 32, 8),
    (p_user_id, 'Formulário', 'Alteração', 'Muito Baixa', 1, 1, 8, 2),
    (p_user_id, 'On-Line', 'Alteração', 'Muito Alta', 6, 8, 58, 8),
    (p_user_id, 'On-Line', 'Novo', 'Muito Alta', 8, 16, 80, 16),
    (p_user_id, 'Outbound', 'Alteração', 'Media', 2, 4, 24, 8)
  on conflict (user_id, tipo, objeto, complexidade) do nothing;

  insert into public.cliente_parametros
    (user_id, empresa, levantamento, impl_proposal, esp_func, esp_tec, codific,
     traducao_en, traducao_es, teste_unitario, teste_qas, bpp_pt, bpp_en, bpp_es,
     teste_volume, homologacao, access_control, homologacao_2, go_live,
     documentacao, gerencia)
  values
    (p_user_id, 'Loreal', 0.80, 0.00, 0.80, 0.80, 0.80, 0.00, 0.00, 0.80, 0.80, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.80, 0.80, 0.80, 0.80),
    (p_user_id, 'Casa e Video', 1.40, 0.00, 1.40, 1.40, 1.40, 0.00, 0.00, 1.40, 1.40, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.40, 1.40, 1.40, 1.40),
    (p_user_id, 'Merck', 1.00, 0.00, 1.00, 1.00, 1.00, 0.00, 0.00, 1.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.00, 1.00, 1.00, 1.00),
    (p_user_id, 'Origem', 1.00, 0.00, 1.00, 1.00, 1.00, 0.00, 0.00, 1.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.00, 1.00, 1.00, 1.00),
    (p_user_id, 'Leader', 1.20, 0.00, 1.20, 1.20, 1.20, 0.00, 0.00, 1.20, 1.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.20, 1.20, 1.20, 1.20),
    (p_user_id, 'Base', 1.00, 0.00, 1.00, 1.00, 1.00, 0.00, 0.00, 1.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.00, 1.00, 1.00, 1.00),
    (p_user_id, 'Supergasbras', 1.20, 0.00, 1.20, 1.20, 1.20, 0.00, 0.00, 1.20, 1.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.20, 1.20, 1.20, 1.20),
    (p_user_id, 'Hortifruti', 1.30, 0.00, 1.30, 1.30, 1.30, 0.00, 0.00, 1.30, 1.30, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1.30, 1.30, 1.30, 1.30)
  on conflict (user_id, empresa) do nothing;
end;
$$;

-- Semeia os usuários já existentes (idempotente).
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.seed_default_parametros(u.id);
  end loop;
end;
$$;

-- Semeia automaticamente todo novo usuário cadastrado.
create or replace function public.handle_new_user_parametros()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_parametros(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_parametros on auth.users;
create trigger on_auth_user_created_parametros
  after insert on auth.users
  for each row
  execute function public.handle_new_user_parametros();

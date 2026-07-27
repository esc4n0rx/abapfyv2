-- Abapfy — tabela de perfis de usuário
-- Estende auth.users com os campos coletados no cadastro (nome, cargo, empresa).
-- O e-mail e a senha já são geridos pelo Supabase Auth; não são duplicados aqui.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  cargo text,
  empresa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados complementares de cadastro dos usuários Abapfy.';

-- Mantém updated_at sincronizado a cada alteração
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Cria automaticamente um perfil quando um novo usuário se registra no Supabase Auth,
-- lendo nome/cargo/empresa enviados em options.data no supabase.auth.signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, cargo, empresa)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'cargo',
    new.raw_user_meta_data ->> 'empresa'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

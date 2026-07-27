-- Abapfy — Row Level Security para estimativa_parametros e cliente_parametros
--
-- Tabelas por usuário: cada usuário só lê/edita sua própria cópia dos
-- parâmetros de estimativa (semeada automaticamente em 010_estimativa_parametros.sql).

alter table public.estimativa_parametros enable row level security;

drop policy if exists "estimativa_parametros_select_own" on public.estimativa_parametros;
create policy "estimativa_parametros_select_own"
  on public.estimativa_parametros
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "estimativa_parametros_insert_own" on public.estimativa_parametros;
create policy "estimativa_parametros_insert_own"
  on public.estimativa_parametros
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "estimativa_parametros_update_own" on public.estimativa_parametros;
create policy "estimativa_parametros_update_own"
  on public.estimativa_parametros
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "estimativa_parametros_delete_own" on public.estimativa_parametros;
create policy "estimativa_parametros_delete_own"
  on public.estimativa_parametros
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.cliente_parametros enable row level security;

drop policy if exists "cliente_parametros_select_own" on public.cliente_parametros;
create policy "cliente_parametros_select_own"
  on public.cliente_parametros
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cliente_parametros_insert_own" on public.cliente_parametros;
create policy "cliente_parametros_insert_own"
  on public.cliente_parametros
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cliente_parametros_update_own" on public.cliente_parametros;
create policy "cliente_parametros_update_own"
  on public.cliente_parametros
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cliente_parametros_delete_own" on public.cliente_parametros;
create policy "cliente_parametros_delete_own"
  on public.cliente_parametros
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Abapfy — Row Level Security para default_agents e user_agents

alter table public.default_agents enable row level security;

-- Leitura liberada para qualquer usuário autenticado. Sem policy de
-- insert/update/delete para o role "authenticated": os defaults só mudam via
-- seed SQL rodado com a service role — o cliente nunca pode alterá-los ou
-- excluí-los.
drop policy if exists "default_agents_select_all" on public.default_agents;
create policy "default_agents_select_all"
  on public.default_agents
  for select
  to authenticated
  using (true);

alter table public.user_agents enable row level security;

drop policy if exists "user_agents_select_own" on public.user_agents;
create policy "user_agents_select_own"
  on public.user_agents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_agents_insert_own" on public.user_agents;
create policy "user_agents_insert_own"
  on public.user_agents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_agents_update_own" on public.user_agents;
create policy "user_agents_update_own"
  on public.user_agents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_agents_delete_own" on public.user_agents;
create policy "user_agents_delete_own"
  on public.user_agents
  for delete
  to authenticated
  using (auth.uid() = user_id);

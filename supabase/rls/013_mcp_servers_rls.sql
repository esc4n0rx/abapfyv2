-- Abapfy — RLS dos servidores MCP e vínculos N:N com agentes.

alter table public.mcp_servers enable row level security;

drop policy if exists "mcp_servers_select_own" on public.mcp_servers;
create policy "mcp_servers_select_own" on public.mcp_servers
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "mcp_servers_insert_own" on public.mcp_servers;
create policy "mcp_servers_insert_own" on public.mcp_servers
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "mcp_servers_update_own" on public.mcp_servers;
create policy "mcp_servers_update_own" on public.mcp_servers
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mcp_servers_delete_own" on public.mcp_servers;
create policy "mcp_servers_delete_own" on public.mcp_servers
  for delete to authenticated using (auth.uid() = user_id);

alter table public.mcp_agent_bindings enable row level security;

drop policy if exists "mcp_agent_bindings_select_own" on public.mcp_agent_bindings;
create policy "mcp_agent_bindings_select_own" on public.mcp_agent_bindings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "mcp_agent_bindings_insert_own" on public.mcp_agent_bindings;
create policy "mcp_agent_bindings_insert_own" on public.mcp_agent_bindings
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.mcp_servers server
      where server.id = mcp_agent_bindings.server_id and server.user_id = auth.uid()
    )
  );

drop policy if exists "mcp_agent_bindings_update_own" on public.mcp_agent_bindings;
create policy "mcp_agent_bindings_update_own" on public.mcp_agent_bindings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.mcp_servers server
      where server.id = mcp_agent_bindings.server_id and server.user_id = auth.uid()
    )
  );

drop policy if exists "mcp_agent_bindings_delete_own" on public.mcp_agent_bindings;
create policy "mcp_agent_bindings_delete_own" on public.mcp_agent_bindings
  for delete to authenticated using (auth.uid() = user_id);


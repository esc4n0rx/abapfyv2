-- Apply after 021-024. Only MASTER/ADMIN provision AI keys and MCP integrations.
-- Keep key reads scoped to the owner; administrators see configuration status only.

drop policy if exists "ai_api_keys_insert_own" on public.ai_api_keys;
drop policy if exists "ai_api_keys_update_own" on public.ai_api_keys;
drop policy if exists "ai_api_keys_delete_own" on public.ai_api_keys;

create or replace function public.list_ai_access_users()
returns table(user_id uuid, display_name text, email text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_abapfy_admin() then raise exception 'Administrator required'; end if;
  return query
    select u.id, coalesce(nullif(trim(p.nome), ''), u.email)::text, u.email::text
    from auth.users u left join public.profiles p on p.id = u.id
    order by coalesce(nullif(trim(p.nome), ''), u.email), u.email;
end $$;
revoke all on function public.list_ai_access_users() from public, anon;
grant execute on function public.list_ai_access_users() to authenticated;

create or replace function public.list_ai_custom_agents(p_user_id uuid)
returns table(id text, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_abapfy_admin() then raise exception 'Administrator required'; end if;
  return query select a.id::text, a.name from public.user_agents a
    where a.user_id = p_user_id order by a.name;
end $$;
revoke all on function public.list_ai_custom_agents(uuid) from public, anon;
grant execute on function public.list_ai_custom_agents(uuid) to authenticated;

create or replace function public.list_ai_key_status(p_user_id uuid)
returns table(provider text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_abapfy_admin() then raise exception 'Administrator required'; end if;
  return query select k.provider, k.updated_at from public.ai_api_keys k
    where k.user_id = p_user_id order by k.provider;
end $$;
revoke all on function public.list_ai_key_status(uuid) from public, anon;
grant execute on function public.list_ai_key_status(uuid) to authenticated;

create or replace function public.set_ai_api_key(p_user_id uuid, p_provider text, p_api_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_abapfy_admin() then raise exception 'Administrator required'; end if;
  if p_provider not in ('openai', 'gemini', 'claude') or nullif(trim(p_api_key), '') is null then
    raise exception 'Invalid provider or API key';
  end if;
  insert into public.ai_api_keys(user_id, provider, api_key)
    values (p_user_id, p_provider, trim(p_api_key))
    on conflict (user_id, provider) do update set api_key = excluded.api_key;
end $$;
revoke all on function public.set_ai_api_key(uuid, text, text) from public, anon;
grant execute on function public.set_ai_api_key(uuid, text, text) to authenticated;

create or replace function public.remove_ai_api_key(p_user_id uuid, p_provider text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_abapfy_admin() then raise exception 'Administrator required'; end if;
  delete from public.ai_api_keys where user_id = p_user_id and provider = p_provider;
  update public.user_settings set default_ai_provider = null, default_ai_model = null
    where user_id = p_user_id and default_ai_provider = p_provider;
end $$;
revoke all on function public.remove_ai_api_key(uuid, text) from public, anon;
grant execute on function public.remove_ai_api_key(uuid, text) to authenticated;

drop policy if exists "mcp_servers_insert_own" on public.mcp_servers;
drop policy if exists "mcp_servers_update_own" on public.mcp_servers;
drop policy if exists "mcp_servers_delete_own" on public.mcp_servers;
create policy mcp_servers_admin_read on public.mcp_servers for select to authenticated
  using (public.is_abapfy_admin());
create policy mcp_servers_admin_insert on public.mcp_servers for insert to authenticated
  with check (public.is_abapfy_admin());
create policy mcp_servers_admin_update on public.mcp_servers for update to authenticated
  using (public.is_abapfy_admin()) with check (public.is_abapfy_admin());
create policy mcp_servers_admin_delete on public.mcp_servers for delete to authenticated
  using (public.is_abapfy_admin());

drop policy if exists "mcp_agent_bindings_insert_own" on public.mcp_agent_bindings;
drop policy if exists "mcp_agent_bindings_update_own" on public.mcp_agent_bindings;
drop policy if exists "mcp_agent_bindings_delete_own" on public.mcp_agent_bindings;
create policy mcp_bindings_admin_read on public.mcp_agent_bindings for select to authenticated
  using (public.is_abapfy_admin());
create policy mcp_bindings_admin_insert on public.mcp_agent_bindings for insert to authenticated
  with check (public.is_abapfy_admin() and exists (
    select 1 from public.mcp_servers s where s.id = server_id and s.user_id = mcp_agent_bindings.user_id
  ));
create policy mcp_bindings_admin_update on public.mcp_agent_bindings for update to authenticated
  using (public.is_abapfy_admin()) with check (public.is_abapfy_admin() and exists (
    select 1 from public.mcp_servers s where s.id = server_id and s.user_id = mcp_agent_bindings.user_id
  ));
create policy mcp_bindings_admin_delete on public.mcp_agent_bindings for delete to authenticated
  using (public.is_abapfy_admin());

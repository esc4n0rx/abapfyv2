-- Abapfy — Row Level Security para user_settings e ai_api_keys
-- Cada usuário só lê e altera seus próprios registros.

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.ai_api_keys enable row level security;

drop policy if exists "ai_api_keys_select_own" on public.ai_api_keys;
create policy "ai_api_keys_select_own"
  on public.ai_api_keys
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_api_keys_insert_own" on public.ai_api_keys;
create policy "ai_api_keys_insert_own"
  on public.ai_api_keys
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_api_keys_update_own" on public.ai_api_keys;
create policy "ai_api_keys_update_own"
  on public.ai_api_keys
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_api_keys_delete_own" on public.ai_api_keys;
create policy "ai_api_keys_delete_own"
  on public.ai_api_keys
  for delete
  to authenticated
  using (auth.uid() = user_id);

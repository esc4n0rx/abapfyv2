-- Abapfy — Row Level Security para projects, chats e chat_messages

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.chats enable row level security;

drop policy if exists "chats_select_own" on public.chats;
create policy "chats_select_own"
  on public.chats
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own"
  on public.chats
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chats_update_own" on public.chats;
create policy "chats_update_own"
  on public.chats
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own"
  on public.chats
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  to authenticated
  using (auth.uid() = user_id);

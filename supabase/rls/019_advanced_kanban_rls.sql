alter table public.task_columns enable row level security;

drop policy if exists "task_columns_select_own" on public.task_columns;
create policy "task_columns_select_own" on public.task_columns
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "task_columns_insert_own" on public.task_columns;
create policy "task_columns_insert_own" on public.task_columns
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "task_columns_update_own" on public.task_columns;
create policy "task_columns_update_own" on public.task_columns
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "task_columns_delete_own" on public.task_columns;
create policy "task_columns_delete_own" on public.task_columns
  for delete to authenticated using (auth.uid() = user_id);

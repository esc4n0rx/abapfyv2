-- Abapfy — RLS do quadro pessoal de tarefas

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

alter table public.task_subtasks enable row level security;

drop policy if exists "task_subtasks_select_own" on public.task_subtasks;
create policy "task_subtasks_select_own" on public.task_subtasks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "task_subtasks_insert_own" on public.task_subtasks;
create policy "task_subtasks_insert_own" on public.task_subtasks
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks task
      where task.id = task_subtasks.task_id and task.user_id = auth.uid()
    )
  );

drop policy if exists "task_subtasks_update_own" on public.task_subtasks;
create policy "task_subtasks_update_own" on public.task_subtasks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks task
      where task.id = task_subtasks.task_id and task.user_id = auth.uid()
    )
  );

drop policy if exists "task_subtasks_delete_own" on public.task_subtasks;
create policy "task_subtasks_delete_own" on public.task_subtasks
  for delete to authenticated using (auth.uid() = user_id);

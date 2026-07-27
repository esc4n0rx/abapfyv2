-- Abapfy — Row Level Security para user_skills
-- Cada usuário só lê e altera as próprias skills.

alter table public.user_skills enable row level security;

drop policy if exists "user_skills_select_own" on public.user_skills;
create policy "user_skills_select_own"
  on public.user_skills
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_skills_insert_own" on public.user_skills;
create policy "user_skills_insert_own"
  on public.user_skills
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_skills_update_own" on public.user_skills;
create policy "user_skills_update_own"
  on public.user_skills
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_skills_delete_own" on public.user_skills;
create policy "user_skills_delete_own"
  on public.user_skills
  for delete
  to authenticated
  using (auth.uid() = user_id);
